import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    CacheModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTtl'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
