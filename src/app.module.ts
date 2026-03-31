import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthorModule } from './author/author.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST') ?? 'localhost',
        port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
        username: config.get<string>('DB_USER') ?? 'app',
        password: config.get<string>('DB_PASSWORD') ?? 'app',
        database: config.get<string>('DB_NAME') ?? 'app',
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    AuthorModule,
    ArticlesModule,
  ],
})
export class AppModule {}
