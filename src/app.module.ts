import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './common/config/config.module';
import { RedisModule } from './common/redis/redis.module';
import { KafkaModule } from './common/kafka/kafka.module';
import { CacheModule } from './common/cache/cache.module';
import { LoggingModule } from './common/logging/logging.module';
import { SanitizationModule } from './common/sanitization/sanitization.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WebSocketModule } from './common/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const mongoUri = configService.get<string>('database.uri');
        if (!mongoUri) {
          throw new Error('MONGO_URI is not defined in environment variables');
        }
        return {
          uri: mongoUri,
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    KafkaModule,
    CacheModule,
    LoggingModule,
    SanitizationModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    MessagesModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
