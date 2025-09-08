import { registerAs } from '@nestjs/config';

export const KafkaConfig = registerAs('kafka', () => ({
  broker: process.env.KAFKA_BROKER,
}));
