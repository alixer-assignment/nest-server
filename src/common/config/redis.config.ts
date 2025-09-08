import { registerAs } from '@nestjs/config';

export const RedisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,
}));
