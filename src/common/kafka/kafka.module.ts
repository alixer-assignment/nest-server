import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KafkaService } from './kafka.service';
import { MessageProcessorService } from './services/message-processor.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [KafkaService, MessageProcessorService],
  exports: [KafkaService, MessageProcessorService],
})
export class KafkaModule {}
