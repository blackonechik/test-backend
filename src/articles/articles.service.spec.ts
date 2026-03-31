import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ArticleCacheService } from '../redis/article-cache.service';
import { Article } from './article.entity';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repo: jest.Mocked<Pick<Repository<Article>, 'create' | 'save' | 'findOne' | 'findOneOrFail' | 'remove' | 'createQueryBuilder'>>;
  let cache: jest.Mocked<
    Pick<
      ArticleCacheService,
      | 'listQueryKey'
      | 'getCachedList'
      | 'setCachedList'
      | 'getCachedItem'
      | 'setCachedItem'
      | 'invalidateAfterMutation'
    >
  >;

  function mockQueryBuilder(rows: Article[], total: number) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
    };
    return qb as unknown as SelectQueryBuilder<Article>;
  }

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    cache = {
      listQueryKey: jest.fn().mockReturnValue('test-hash'),
      getCachedList: jest.fn().mockResolvedValue(null),
      setCachedList: jest.fn().mockResolvedValue(undefined),
      getCachedItem: jest.fn().mockResolvedValue(null),
      setCachedItem: jest.fn().mockResolvedValue(undefined),
      invalidateAfterMutation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: getRepositoryToken(Article), useValue: repo },
        { provide: ArticleCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(ArticlesService);
  });

  it('findAll возвращает данные из кэша, если есть запись', async () => {
    const cached = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    cache.getCachedList.mockResolvedValueOnce(cached);

    const result = await service.findAll({});
    expect(result).toBe(cached);
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('findAll строит запрос с фильтром по автору', async () => {
    const authorId = 'a0000000-0000-4000-8000-000000000001';
    const article = {
      id: 'b0000000-0000-4000-8000-000000000002',
      title: 'T',
      description: 'D',
      publishedAt: new Date('2026-01-15T10:00:00Z'),
      authorId,
      author: {
        id: authorId,
        displayName: null,
        createdAt: new Date(),
        account: { email: 'a@x.com' },
        articles: [],
      },
    } as Article;

    repo.createQueryBuilder.mockReturnValue(mockQueryBuilder([article], 1));

    await service.findAll({ authorId, page: 1, limit: 5 });

    const qb = repo.createQueryBuilder.mock.results[0].value as ReturnType<
      typeof mockQueryBuilder
    >;
    expect(qb.andWhere).toHaveBeenCalled();
  });

  it('findOne бросает NotFoundException, если статьи нет', async () => {
    cache.getCachedItem.mockResolvedValueOnce(null);
    repo.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne('c0000000-0000-4000-8000-000000000003')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update запрещает изменение чужой статьи', async () => {
    const id = 'd0000000-0000-4000-8000-000000000004';
    const owner = 'e0000000-0000-4000-8000-000000000005';
    const other = 'f0000000-0000-4000-8000-000000000006';

    repo.findOne.mockResolvedValueOnce({
      id,
      authorId: owner,
      title: 't',
      description: 'd',
      publishedAt: new Date(),
      author: {
        id: owner,
        displayName: null,
        createdAt: new Date(),
        account: { email: 'o@x.com' },
        articles: [],
      },
    } as Article);

    await expect(
      service.update(id, { title: 'new' }, other),
    ).rejects.toThrow(ForbiddenException);
  });
});
