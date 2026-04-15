import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redis!: Redis;

  onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => this.logger.log(`Connected to Redis at ${url}`));
    this.redis.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async addToken(token: string, expiryTimestampMs: number): Promise<void> {
    const ttlSeconds = Math.ceil((expiryTimestampMs - Date.now()) / 1000);
    if (ttlSeconds <= 0) return; // already expired, no need to store
    await this.redis.set(`blacklist:${token}`, '1', 'EX', ttlSeconds);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.exists(`blacklist:${token}`);
    return result === 1;
  }
}
