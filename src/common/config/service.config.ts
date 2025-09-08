import { registerAs } from '@nestjs/config';

export const ServiceConfig = registerAs('service', () => ({
  sharedSecret: process.env.SERVICE_SHARED_SECRET,
}));
