import { registerAs } from '@nestjs/config';

export const DatabaseConfig = registerAs('database', () => ({
  uri: process.env.MONGO_URI,
}));
