import { registerAs } from '@nestjs/config';

export const FastApiConfig = registerAs('fastapi', () => ({
  url: process.env.FASTAPI_URL,
}));
