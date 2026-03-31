import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleCacheService } from '../redis/article-cache.service';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

export type ArticleView = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  author: { id: string; email: string };
};

export type PaginatedArticles = {
  data: ArticleView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function startOfDayFromInput(s: string): Date {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDayFromInput(s: string): Date {
  const d = new Date(s);
  d.setHours(23, 59, 59, 999);
  return d;
}

function mapArticle(entity: Article): ArticleView {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    publishedAt: entity.publishedAt.toISOString(),
    author: {
      id: entity.author.id,
      email: entity.author.account?.email ?? '',
    },
  };
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepo: Repository<Article>,
    private readonly articleCache: ArticleCacheService,
  ) {}

  private listQueryFingerprint(dto: QueryArticlesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    return {
      page,
      limit,
      authorId: dto.authorId ?? null,
      publishedFrom: dto.publishedFrom ?? null,
      publishedTo: dto.publishedTo ?? null,
    };
  }

  async findAll(query: QueryArticlesDto): Promise<PaginatedArticles> {
    const fingerprint = this.listQueryFingerprint(query);
    const queryHash = this.articleCache.listQueryKey(fingerprint);

    const cached = await this.articleCache.getCachedList<PaginatedArticles>(
      queryHash,
    );
    if (cached) {
      return cached;
    }

    const page = fingerprint.page;
    const limit = fingerprint.limit;
    const qb = this.articlesRepo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('author.account', 'authorAccount');

    if (fingerprint.authorId) {
      qb.andWhere('article.authorId = :authorId', {
        authorId: fingerprint.authorId,
      });
    }
    if (fingerprint.publishedFrom) {
      qb.andWhere('article.publishedAt >= :from', {
        from: startOfDayFromInput(fingerprint.publishedFrom),
      });
    }
    if (fingerprint.publishedTo) {
      qb.andWhere('article.publishedAt <= :to', {
        to: endOfDayFromInput(fingerprint.publishedTo),
      });
    }

    qb.orderBy('article.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const totalPages =
      total === 0 ? 0 : Math.ceil(total / limit);

    const result: PaginatedArticles = {
      data: rows.map(mapArticle),
      total,
      page,
      limit,
      totalPages,
    };

    await this.articleCache.setCachedList(queryHash, result);
    return result;
  }

  async findOne(id: string): Promise<ArticleView> {
    const cached = await this.articleCache.getCachedItem<ArticleView>(id);
    if (cached) {
      return cached;
    }

    const article = await this.articlesRepo.findOne({
      where: { id },
      relations: ['author', 'author.account'],
    });
    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }
    const view = mapArticle(article);
    await this.articleCache.setCachedItem(id, view);
    return view;
  }

  async create(dto: CreateArticleDto, authorId: string): Promise<ArticleView> {
    const entity = this.articlesRepo.create({
      title: dto.title,
      description: dto.description,
      publishedAt: new Date(dto.publishedAt),
      authorId,
    });
    const saved = await this.articlesRepo.save(entity);
    const full = await this.articlesRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['author', 'author.account'],
    });
    const view = mapArticle(full);
    await this.articleCache.invalidateAfterMutation();
    return view;
  }

  async update(
    id: string,
    dto: UpdateArticleDto,
    userId: string,
  ): Promise<ArticleView> {
    const article = await this.articlesRepo.findOne({
      where: { id },
      relations: ['author', 'author.account'],
    });
    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }
    if (article.authorId !== userId) {
      throw new ForbiddenException('Можно изменять только свои статьи');
    }
    if (dto.title !== undefined) article.title = dto.title;
    if (dto.description !== undefined) article.description = dto.description;
    if (dto.publishedAt !== undefined) {
      article.publishedAt = new Date(dto.publishedAt);
    }
    await this.articlesRepo.save(article);
    const full = await this.articlesRepo.findOneOrFail({
      where: { id: article.id },
      relations: ['author', 'author.account'],
    });
    const view = mapArticle(full);
    await this.articleCache.invalidateAfterMutation(id);
    return view;
  }

  async remove(id: string, userId: string): Promise<void> {
    const article = await this.articlesRepo.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }
    if (article.authorId !== userId) {
      throw new ForbiddenException('Можно удалять только свои статьи');
    }
    await this.articlesRepo.remove(article);
    await this.articleCache.invalidateAfterMutation(id);
  }
}
