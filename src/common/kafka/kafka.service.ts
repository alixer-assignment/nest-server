import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const kafkaBroker = this.configService.get<string>('kafka.broker');
    if (!kafkaBroker) {
      throw new Error('KAFKA_BROKER is not defined in environment variables');
    }

    this.kafka = new Kafka({
      clientId: 'backend-service',
      brokers: [kafkaBroker],
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'backend-group' });

    await this.producer.connect();
    await this.consumer.connect();

    console.log('Kafka producer and consumer connected successfully');
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }

  async produce(topic: string, message: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id || Date.now().toString(),
            value: JSON.stringify(message),
          },
        ],
      });
      console.log(`Message sent to topic ${topic}:`, message);
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
      await this.consumer.subscribe({ topic, fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = message.value?.toString();
            if (messageValue) {
              const parsedMessage = JSON.parse(messageValue);
              console.log(
                `Message received from topic ${topic}:`,
                parsedMessage,
              );
              callback(parsedMessage);
            }
          } catch (error) {
            console.error('Error processing consumed message:', error);
          }
        },
      });

      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Error setting up Kafka consumer:', error);
      throw error;
    }
  }

  async createTopic(topic: string, numPartitions: number = 1): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();

    try {
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions,
          },
        ],
      });
      console.log(`Topic ${topic} created successfully`);
    } catch (error: any) {
      if (error.type === 'TOPIC_ALREADY_EXISTS') {
        console.log(`Topic ${topic} already exists`);
      } else {
        console.error('Error creating topic:', error);
        throw error;
      }
    } finally {
      await admin.disconnect();
    }
  }
}
