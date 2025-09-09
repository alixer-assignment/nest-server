import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { CacheModule } from '../cache/cache.module';

@Global()
@Module({
  imports: [CacheModule],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
