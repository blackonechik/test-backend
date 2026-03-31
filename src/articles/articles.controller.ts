import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('articles')
@ApiExtraModels(QueryArticlesDto)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Список статей' })
  @ApiOkResponse({
    description: 'Постраничный список',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Пример',
            description: 'Описание',
            publishedAt: '2026-03-28T12:00:00.000Z',
            author: {
              id: '650e8400-e29b-41d4-a716-446655440001',
              email: 'author@example.com',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  findAll(@Query() query: QueryArticlesDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Одна статья по id' })
  @ApiOkResponse({ description: 'статья' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.articlesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Создать статью' })
  @ApiCreatedResponse({ description: 'Созданная статья' })
  create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.articlesService.create(dto, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Обновить статью (только автор)' })
  @ApiOkResponse({ description: 'Обновлённая статья' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.articlesService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Удалить статью (только автор)' })
  @ApiOkResponse({
    schema: { example: { success: true } },
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    await this.articlesService.remove(id, user.userId);
    return { success: true };
  }
}
