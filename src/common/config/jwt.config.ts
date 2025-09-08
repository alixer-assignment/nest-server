import { registerAs } from '@nestjs/config';

export const JwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTtl: process.env.JWT_ACCESS_TTL || '900s',
  refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
}));
