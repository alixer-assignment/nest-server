import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  identifier: string;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private cacheService: CacheService) {}

  /**
   * Check rate limit for message sending per user
   */
  async checkMessageRateLimit(
    userId: string,
    limit: number = 60, // 60 messages per window
    windowSeconds: number = 60, // 1 minute window
  ): Promise<RateLimitResult> {
    const identifier = `message:user:${userId}`;
    return this.checkRateLimit(identifier, limit, windowSeconds);
  }

  /**
   * Check rate limit for message sending per IP
   */
  async checkIPRateLimit(
    ip: string,
    limit: number = 100, // 100 messages per window
    windowSeconds: number = 60, // 1 minute window
  ): Promise<RateLimitResult> {
    const identifier = `message:ip:${ip}`;
    return this.checkRateLimit(identifier, limit, windowSeconds);
  }

  /**
   * Check rate limit for WebSocket connections per IP
   */
  async checkWebSocketRateLimit(
    ip: string,
    limit: number = 10, // 10 connections per window
    windowSeconds: number = 300, // 5 minute window
  ): Promise<RateLimitResult> {
    const identifier = `websocket:ip:${ip}`;
    return this.checkRateLimit(identifier, limit, windowSeconds);
  }

  /**
   * Check rate limit for API requests per user
   */
  async checkAPIRateLimit(
    userId: string,
    limit: number = 1000, // 1000 requests per window
    windowSeconds: number = 3600, // 1 hour window
  ): Promise<RateLimitResult> {
    const identifier = `api:user:${userId}`;
    return this.checkRateLimit(identifier, limit, windowSeconds);
  }

  /**
   * Check rate limit for room joins per user
   */
  async checkRoomJoinRateLimit(
    userId: string,
    limit: number = 20, // 20 room joins per window
    windowSeconds: number = 300, // 5 minute window
  ): Promise<RateLimitResult> {
    const identifier = `room_join:user:${userId}`;
    return this.checkRateLimit(identifier, limit, windowSeconds);
  }

  /**
   * Generic rate limit check with sliding window
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      const result = await this.cacheService.checkRateLimit(
        identifier,
        limit,
        windowSeconds,
      );

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        this.logger.warn(
          `Rate limit exceeded for ${identifier}: ${limit}/${windowSeconds}s`,
        );

        return {
          ...result,
          retryAfter: Math.max(0, retryAfter),
        };
      }

      this.logger.debug(
        `Rate limit check passed for ${identifier}: ${result.remaining} remaining`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error checking rate limit for ${identifier}:`, error);

      // On error, allow the request but log the issue
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }

  /**
   * Get rate limit info without consuming a request
   */
  async getRateLimitInfo(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
  }> {
    try {
      const key = `rate_limit:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;

      // Remove expired entries
      await this.cacheService.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const current = await this.cacheService.zcard(key);
      const remaining = Math.max(0, limit - current);

      // Get oldest request to calculate reset time
      const oldestRequests = await this.cacheService.zrange(key, 0, 0);
      const oldestTime =
        oldestRequests.length > 0 ? parseInt(oldestRequests[0]) : now;
      const resetTime = oldestTime + windowSeconds * 1000;

      return {
        current,
        remaining,
        resetTime,
      };
    } catch (error) {
      this.logger.error(
        `Error getting rate limit info for ${identifier}:`,
        error,
      );
      return {
        current: 0,
        remaining: limit,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetRateLimit(identifier: string): Promise<void> {
    try {
      const key = `rate_limit:${identifier}`;
      await this.cacheService.del(key);
      this.logger.log(`Rate limit reset for ${identifier}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for ${identifier}:`, error);
    }
  }

  /**
   * Get all rate limit configurations
   */
  getRateLimitConfigs(): Record<string, RateLimitConfig> {
    return {
      messageUser: {
        limit: 60,
        windowSeconds: 60,
        identifier: 'message:user',
      },
      messageIP: {
        limit: 100,
        windowSeconds: 60,
        identifier: 'message:ip',
      },
      websocketIP: {
        limit: 10,
        windowSeconds: 300,
        identifier: 'websocket:ip',
      },
      apiUser: {
        limit: 1000,
        windowSeconds: 3600,
        identifier: 'api:user',
      },
      roomJoinUser: {
        limit: 20,
        windowSeconds: 300,
        identifier: 'room_join:user',
      },
    };
  }
}
