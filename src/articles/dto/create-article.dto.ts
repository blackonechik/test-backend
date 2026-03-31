import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ example: 'Введение в NestJS', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'Краткое описание содержимого статьи.' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  description: string;

  @ApiProperty({ example: '2026-03-28T12:00:00.000Z' })
  @IsDateString()
  publishedAt: string;
}
