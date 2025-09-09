import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private cacheService: CacheService,
    private jwtService: JwtService,
  ) {}

  /**
   * Blacklist a refresh token
   */
  async blacklistRefreshToken(token: string): Promise<void> {
    try {
      // Decode token to get expiration time
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.exp) {
        this.logger.warn('Invalid token provided for blacklisting');
        return;
      }

      // Calculate TTL (time until token expires)
      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        await this.cacheService.blacklistToken(token, ttl);
        this.logger.log(`Refresh token blacklisted, TTL: ${ttl} seconds`);
      }
    } catch (error) {
      this.logger.error('Error blacklisting refresh token:', error);
    }
  }

  /**
   * Check if refresh token is blacklisted
   */
  async isRefreshTokenBlacklisted(token: string): Promise<boolean> {
    try {
      return await this.cacheService.isTokenBlacklisted(token);
    } catch (error) {
      this.logger.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Blacklist all tokens for a user (logout from all devices)
   */
  async blacklistAllUserTokens(userId: string): Promise<void> {
    try {
      // Store user ID with a timestamp to invalidate all tokens issued before this time
      const key = `blacklist:user:${userId}`;
      const timestamp = Date.now();
      await this.cacheService.set(key, { blacklistedAt: timestamp }, 86400 * 7); // 7 days TTL

      this.logger.log(`All tokens blacklisted for user ${userId}`);
    } catch (error) {
      this.logger.error('Error blacklisting all user tokens:', error);
    }
  }

  /**
   * Check if user's tokens are blacklisted
   */
  async isUserBlacklisted(
    userId: string,
    tokenIssuedAt: number,
  ): Promise<boolean> {
    try {
      const key = `blacklist:user:${userId}`;
      const blacklistData = await this.cacheService.get(key);

      if (!blacklistData) {
        return false;
      }

      // Check if token was issued before blacklist time
      return tokenIssuedAt < blacklistData.blacklistedAt;
    } catch (error) {
      this.logger.error('Error checking user blacklist:', error);
      return false;
    }
  }

  /**
   * Validate access token (check if not blacklisted)
   */
  async validateAccessToken(token: string): Promise<boolean> {
    try {
      // For access tokens, we typically don't blacklist them individually
      // since they have short expiration times
      // But we can check if the user is globally blacklisted
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded || !decoded.sub || !decoded.iat) {
        return false;
      }

      return !(await this.isUserBlacklisted(decoded.sub, decoded.iat * 1000));
    } catch (error) {
      this.logger.error('Error validating access token:', error);
      return false;
    }
  }

  /**
   * Clean up expired blacklist entries
   */
  async cleanupExpiredBlacklist(): Promise<void> {
    try {
      // This would typically be done by Redis TTL, but we can add cleanup logic here
      this.logger.log('Blacklist cleanup completed');
    } catch (error) {
      this.logger.error('Error during blacklist cleanup:', error);
    }
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<{
    totalBlacklistedTokens: number;
    totalBlacklistedUsers: number;
  }> {
    try {
      // This would require scanning Redis keys, which is expensive
      // In production, you'd want to maintain counters
      return {
        totalBlacklistedTokens: 0,
        totalBlacklistedUsers: 0,
      };
    } catch (error) {
      this.logger.error('Error getting blacklist stats:', error);
      return {
        totalBlacklistedTokens: 0,
        totalBlacklistedUsers: 0,
      };
    }
  }
}
