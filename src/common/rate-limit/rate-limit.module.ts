import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
