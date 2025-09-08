import { Module } from '@nestjs/common';
import { ChatGateway } from './websocket.gateway';

@Module({
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class WebSocketModule {}
