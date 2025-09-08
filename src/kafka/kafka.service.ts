import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const kafkaBroker = this.configService.get<string>('kafka.broker');
    if (!kafkaBroker) {
      throw new Error('KAFKA_BROKER is not defined in environment variables');
    }

    await this.kafkaClient.connect();
    console.log('Kafka client connected successfully');
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  async produce(topic: string, message: any): Promise<void> {
    try {
      await this.kafkaClient.emit(topic, message);
    } catch (error) {
      console.error('Error producing Kafka message:', error);
      throw error;
    }
  }

  async consume(
    topic: string,
    callback: (message: any) => void,
  ): Promise<void> {
    try {
      // Subscribe to the topic for responses
      this.kafkaClient.subscribeToResponseOf(topic);

      // Note: For actual message consumption, you would typically use a MessagePattern decorator
      // in a controller or use the raw kafka client. This method sets up the subscription.
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Error setting up Kafka consumer:', error);
      throw error;
    }
  }
}
