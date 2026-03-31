import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ArticleCacheService } from './article-cache.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
    },
    ArticleCacheService,
  ],
  exports: [REDIS_CLIENT, ArticleCacheService],
})
export class RedisModule {}
