import { Module, Global, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KafkaService } from './kafka.service';
import { MessageProcessorService } from './services/message-processor.service';
import { MessagesModule } from '../../modules/messages/messages.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Global()
@Module({
  imports: [
    HttpModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => WebSocketModule),
  ],
  providers: [KafkaService, MessageProcessorService],
  exports: [KafkaService, MessageProcessorService],
})
export class KafkaModule {}
