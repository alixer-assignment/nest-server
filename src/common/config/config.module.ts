import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfig } from './app.config';
import { DatabaseConfig } from './database.config';
import { RedisConfig } from './redis.config';
import { KafkaConfig } from './kafka.config';
import { JwtConfig } from './jwt.config';
import { FastApiConfig } from './fastapi.config';
import { ServiceConfig } from './service.config';
import { validate } from './env.validation';

export const ConfigModule = NestConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],
  load: [
    AppConfig,
    DatabaseConfig,
    RedisConfig,
    KafkaConfig,
    JwtConfig,
    // FastApiConfig,
    ServiceConfig,
  ],
  validate,
});
