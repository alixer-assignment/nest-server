import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/redis/redis.service';
import { Request } from 'express';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      // Check if refresh token is blacklisted
      const isBlacklisted = await this.redisService.exists(
        `blacklist:${refreshToken}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been invalidated');
      }

      // Attach user info to request
      request['user'] = payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return true;
  }
}
