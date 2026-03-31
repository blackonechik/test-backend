import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'node:crypto';
import { REDIS_CLIENT } from './redis.constants';

const LIST_VERSION_KEY = 'articles:meta:listVersion';

@Injectable()
export class ArticleCacheService {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.ttlSeconds = parseInt(
      config.get<string>('CACHE_TTL_SECONDS') ?? '60',
      10,
    );
  }

  listQueryKey(fragment: Record<string, unknown>): string {
    const sorted = JSON.stringify(fragment, Object.keys(fragment).sort());
    return createHash('sha256').update(sorted).digest('hex').slice(0, 32);
  }

  private listCacheKey(listVersion: string, queryHash: string): string {
    return `cache:articles:list:v${listVersion}:${queryHash}`;
  }

  private itemCacheKey(id: string): string {
    return `cache:articles:item:${id}`;
  }

  async getListVersion(): Promise<string> {
    const v = await this.redis.get(LIST_VERSION_KEY);
    return v ?? '0';
  }

  async bumpListVersion(): Promise<void> {
    await this.redis.incr(LIST_VERSION_KEY);
  }

  async getCachedList<T>(queryHash: string): Promise<T | null> {
    const v = await this.getListVersion();
    const raw = await this.redis.get(this.listCacheKey(v, queryHash));
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setCachedList<T>(queryHash: string, value: T): Promise<void> {
    const v = await this.getListVersion();
    await this.redis.set(
      this.listCacheKey(v, queryHash),
      JSON.stringify(value),
      'EX',
      this.ttlSeconds,
    );
  }

  async getCachedItem<T>(id: string): Promise<T | null> {
    const raw = await this.redis.get(this.itemCacheKey(id));
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setCachedItem<T>(id: string, value: T): Promise<void> {
    await this.redis.set(
      this.itemCacheKey(id),
      JSON.stringify(value),
      'EX',
      this.ttlSeconds,
    );
  }

  async invalidateAfterMutation(articleId?: string): Promise<void> {
    await this.bumpListVersion();
    if (articleId) {
      await this.redis.del(this.itemCacheKey(articleId));
    }
  }
}
