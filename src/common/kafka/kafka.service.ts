import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  MessageMetadata,
  ModeratedMessage,
  PersistedMessage,
} from './schemas/message.schemas';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private readonly logger = new Logger(KafkaService.name);

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

    this.logger.log('Kafka producer and consumer connected successfully');
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
      // Validate message based on topic
      const validatedMessage = await this.validateMessage(topic, message);

      await this.producer.send({
        topic,
        messages: [
          {
            key: validatedMessage.id || Date.now().toString(),
            value: JSON.stringify(validatedMessage),
          },
        ],
      });
      this.logger.log(`Message sent to topic ${topic}:`, validatedMessage);
    } catch (error) {
      this.logger.error('Error producing Kafka message:', error);
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

              // Validate consumed message
              const validatedMessage = await this.validateMessage(
                topic,
                parsedMessage,
              );

              this.logger.log(
                `Message received from topic ${topic}:`,
                validatedMessage,
              );
              callback(validatedMessage);
            }
          } catch (error) {
            this.logger.error('Error processing consumed message:', error);
          }
        },
      });

      this.logger.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error('Error setting up Kafka consumer:', error);
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
      this.logger.log(`Topic ${topic} created successfully`);
    } catch (error: any) {
      if (error.type === 'TOPIC_ALREADY_EXISTS') {
        this.logger.log(`Topic ${topic} already exists`);
      } else {
        this.logger.error('Error creating topic:', error);
        throw error;
      }
    } finally {
      await admin.disconnect();
    }
  }

  /**
   * Validate message based on topic schema
   */
  private async validateMessage(topic: string, message: any): Promise<any> {
    let schemaClass: any;

    switch (topic) {
      case 'messages.inbound':
        schemaClass = MessageMetadata;
        break;
      case 'messages.moderated':
        schemaClass = ModeratedMessage;
        break;
      case 'messages.persisted':
        schemaClass = PersistedMessage;
        break;
      default:
        // For unknown topics, return message as-is
        return message;
    }

    const messageInstance = plainToClass(schemaClass, message);
    const errors = await validate(messageInstance);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');

      throw new Error(
        `Message validation failed for topic ${topic}: ${errorMessages}`,
      );
    }

    return messageInstance;
  }

  /**
   * Produce message to messages.inbound topic
   */
  async produceInboundMessage(message: MessageMetadata): Promise<void> {
    return this.produce('messages.inbound', message);
  }

  /**
   * Produce message to messages.moderated topic
   */
  async produceModeratedMessage(message: ModeratedMessage): Promise<void> {
    return this.produce('messages.moderated', message);
  }

  /**
   * Produce message to messages.persisted topic
   */
  async producePersistedMessage(message: PersistedMessage): Promise<void> {
    return this.produce('messages.persisted', message);
  }

  /**
   * Consume messages from messages.inbound topic
   */
  async consumeInboundMessages(
    callback: (message: MessageMetadata) => void,
  ): Promise<void> {
    return this.consume('messages.inbound', callback);
  }

  /**
   * Consume messages from messages.moderated topic
   */
  async consumeModeratedMessages(
    callback: (message: ModeratedMessage) => void,
  ): Promise<void> {
    return this.consume('messages.moderated', callback);
  }

  /**
   * Consume messages from messages.persisted topic
   */
  async consumePersistedMessages(
    callback: (message: PersistedMessage) => void,
  ): Promise<void> {
    return this.consume('messages.persisted', callback);
  }
}
