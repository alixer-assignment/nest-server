import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  constructor(private redisService: RedisService) {}

  /**
   * Set a key-value pair with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    await this.redisService.set(key, serializedValue, ttlSeconds);
  }

  /**
   * Get a value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redisService.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redisService.exists(key);
    return result === 1;
  }

  /**
   * Set TTL for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redisService.expire(key, ttlSeconds);
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    return this.redisService.getClient().ttl(key);
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    return this.redisService.getClient().incr(key);
  }

  /**
   * Increment a counter with TTL
   */
  async incrWithTTL(key: string, ttlSeconds: number): Promise<number> {
    const result = await this.redisService.getClient().incr(key);
    if (result === 1) {
      await this.expire(key, ttlSeconds);
    }
    return result;
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: any): Promise<void> {
    const serializedValue = JSON.stringify(value);
    await this.redisService.hset(key, field, serializedValue);
  }

  /**
   * Get hash field
   */
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    const value = await this.redisService.hget(key, field);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string): Promise<void> {
    await this.redisService.hdel(key, field);
  }

  /**
   * Get all hash fields
   */
  async hgetall<T = any>(key: string): Promise<Record<string, T>> {
    const hash = await this.redisService.hgetall(key);
    const result: Record<string, T> = {};

    for (const [field, value] of Object.entries(hash)) {
      result[field] = JSON.parse(value);
    }

    return result;
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redisService.getClient().zadd(key, score, member);
  }

  /**
   * Get range from sorted set
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redisService.getClient().zrange(key, start, stop);
  }

  /**
   * Remove from sorted set
   */
  async zrem(key: string, member: string): Promise<void> {
    await this.redisService.getClient().zrem(key, member);
  }

  /**
   * Get sorted set size
   */
  async zcard(key: string): Promise<number> {
    return this.redisService.getClient().zcard(key);
  }

  /**
   * Remove expired entries from sorted set
   */
  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    await this.redisService.getClient().zremrangebyscore(key, min, max);
  }

  /**
   * Cache recent messages for a room
   */
  async cacheRecentMessages(roomId: string, messages: any[]): Promise<void> {
    const key = `recent:room:${roomId}`;
    await this.set(key, messages, 300); // 5 minutes TTL
  }

  /**
   * Get recent messages for a room
   */
  async getRecentMessages(roomId: string): Promise<any[] | null> {
    const key = `recent:room:${roomId}`;
    return this.get(key);
  }

  /**
   * Cache user presence
   */
  async cacheUserPresence(userId: string, presence: any): Promise<void> {
    const key = `presence:${userId}`;
    await this.set(key, presence, 30); // 30 seconds TTL
  }

  /**
   * Get user presence
   */
  async getUserPresence(userId: string): Promise<any | null> {
    const key = `presence:${userId}`;
    return this.get(key);
  }

  /**
   * Update user presence heartbeat
   */
  async updateUserHeartbeat(userId: string, presence: any): Promise<void> {
    const key = `presence:${userId}`;
    await this.set(key, presence, 30); // Reset TTL to 30 seconds
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    const key = `blacklist:token:${token}`;
    await this.set(key, { blacklisted: true }, ttlSeconds);
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:token:${token}`;
    return this.exists(key);
  }

  /**
   * Rate limiting with sliding window
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove expired entries
    await this.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const currentCount = await this.zcard(key);

    if (currentCount >= limit) {
      // Get oldest request to calculate reset time
      const oldestRequests = await this.zrange(key, 0, 0);
      const oldestTime =
        oldestRequests.length > 0 ? parseInt(oldestRequests[0]) : now;
      const resetTime = oldestTime + windowSeconds * 1000;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    // Add current request
    await this.zadd(key, now, now.toString());
    await this.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetTime: now + windowSeconds * 1000,
    };
  }
}
