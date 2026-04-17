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

  /**
   * Blacklist a token by its RFC 7519 `jti` claim.
   * TTL is set to the token's remaining lifetime so Redis auto-expires the entry.
   */
  async addToken(jti: string, expiryTimestampMs: number): Promise<void> {
    const ttlSeconds = Math.ceil((expiryTimestampMs - Date.now()) / 1000);
    if (ttlSeconds <= 0) return; // already expired, no need to store
    await this.redis.set(`blacklist:jti:${jti}`, '1', 'EX', ttlSeconds);
  }

  /**
   * Returns true if the given `jti` has been revoked.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.exists(`blacklist:jti:${jti}`);
    return result === 1;
  }
}
