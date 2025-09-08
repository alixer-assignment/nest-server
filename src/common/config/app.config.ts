import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:4000',
  ],
}));
