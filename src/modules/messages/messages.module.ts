import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  MessagesController,
  MessagesControllerDirect,
} from './messages.controller';
import { MessagesService } from './messages.service';
import { KafkaModule } from '../../common/kafka/kafka.module';
import { CacheModule } from '../../common/cache/cache.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { LoggingModule } from '../../common/logging/logging.module';
import { SanitizationModule } from '../../common/sanitization/sanitization.module';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Room.name, schema: RoomSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => KafkaModule),
    CacheModule,
    RateLimitModule,
    LoggingModule,
    SanitizationModule,
    AuthModule,
    RoomsModule,
  ],
  controllers: [MessagesController, MessagesControllerDirect],
  providers: [MessagesService],
  exports: [MessagesService, MongooseModule],
})
export class MessagesModule {}
