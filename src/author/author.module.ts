import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorController } from './author.controller';

@Module({
  imports: [AuthModule],
  controllers: [AuthorController],
})
export class AuthorModule {}

