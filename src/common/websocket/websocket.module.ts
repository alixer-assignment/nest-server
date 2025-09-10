import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './websocket.gateway';
import { PresenceService } from './services/presence.service';
import { WebSocketAuthGuard } from './guards/websocket-auth.guard';
import { WebSocketRoomGuard } from './guards/websocket-room.guard';
import {
  Message,
  MessageSchema,
} from '../../modules/messages/schemas/message.schema';
import { Room, RoomSchema } from '../../modules/rooms/schemas/room.schema';
import { User, UserSchema } from '../../modules/users/schemas/user.schema';
import {
  Membership,
  MembershipSchema,
} from '../../modules/rooms/schemas/membership.schema';
import { MessagesService } from '../../modules/messages/messages.service';
import { RoomsService } from '../../modules/rooms/rooms.service';
import { KafkaModule } from '../kafka/kafka.module';
import { RedisModule } from '../redis/redis.module';
import { CacheModule } from '../cache/cache.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTtl'),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Room.name, schema: RoomSchema },
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
    forwardRef(() => KafkaModule),
    RedisModule,
    CacheModule,
    RateLimitModule,
    SessionModule,
  ],
  providers: [
    ChatGateway,
    PresenceService,
    WebSocketAuthGuard,
    WebSocketRoomGuard,
    MessagesService,
    RoomsService,
  ],
  exports: [ChatGateway, PresenceService],
})
export class WebSocketModule {}
