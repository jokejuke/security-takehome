import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
const FAILURE_TTL_SECONDS = 900; // forget failures after 15 min of inactivity

@Injectable()
export class LoginThrottleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoginThrottleService.name);
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
   * Returns the number of milliseconds the caller must wait before
   * the next sign-in attempt is allowed. Returns 0 if no wait is needed.
   */
  async getWaitTime(handle: string): Promise<number> {
    const blockedUntil = await this.redis.get(`login:blocked_until:${handle}`);
    if (!blockedUntil) return 0;

    const remaining = Number(blockedUntil) - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Record a failed login and set the exponential back-off window.
   */
  async recordFailure(handle: string): Promise<void> {
    const key = `login:fail_count:${handle}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, FAILURE_TTL_SECONDS);

    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, count - 1), MAX_DELAY_MS);
    const blockedUntilMs = Date.now() + delay;
    const ttl = Math.ceil(delay / 1000) + 1;

    await this.redis.set(`login:blocked_until:${handle}`, String(blockedUntilMs), 'EX', ttl);
  }

  /**
   * Clear failure tracking after a successful login.
   */
  async clearFailures(handle: string): Promise<void> {
    await this.redis.del(`login:fail_count:${handle}`, `login:blocked_until:${handle}`);
  }
}
