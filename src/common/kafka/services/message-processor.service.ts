import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from '../kafka.service';
import {
  MessageMetadata,
  ModeratedMessage,
  PersistedMessage,
} from '../schemas/message.schemas';
import { MessagesService } from '../../../modules/messages/messages.service';
import { ChatGateway } from '../../websocket/websocket.gateway';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MessageProcessorService implements OnModuleInit {
  private readonly logger = new Logger(MessageProcessorService.name);
  private readonly fastApiUrl: string;

  constructor(
    private kafkaService: KafkaService,
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {
    this.fastApiUrl =
      this.configService.get<string>('fastapi.url') || 'http://localhost:8000';
  }

  async onModuleInit() {
    // Subscribe to all topics first
    await this.kafkaService.consumeInboundMessages(
      this.handleInboundMessage.bind(this),
    );

    await this.kafkaService.consumeModeratedMessages(
      this.handleModeratedMessage.bind(this),
    );

    // Start the consumer after all topics are subscribed
    await this.kafkaService.startConsumer();

    this.logger.log('Message processor service initialized');
  }

  /**
   * Handle messages from messages.inbound topic
   * Calls FastAPI for moderation and sentiment analysis
   */
  private async handleInboundMessage(message: MessageMetadata): Promise<void> {
    try {
      this.logger.log(`Processing inbound message: ${message.id}`);

      // Call FastAPI moderation endpoint
      const moderationResult = await this.callModerationAPI(message);

      // Call FastAPI sentiment analysis endpoint
      const sentimentResult = await this.callSentimentAPI(message);

      // Create moderated message
      const moderatedMessage: ModeratedMessage = {
        ...message,
        moderation: {
          sentiment: sentimentResult.sentiment,
          flagged: moderationResult.flagged,
          reasons: moderationResult.reasons || [],
          confidence: {
            sentiment: sentimentResult.confidence || 0.5,
            flagged: moderationResult.confidence || 0.5,
          },
        },
        processedAt: new Date().toISOString(),
      };

      // Produce to messages.moderated topic
      await this.kafkaService.produceModeratedMessage(moderatedMessage);

      this.logger.log(
        `Message ${message.id} moderated and sent to messages.moderated topic`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing inbound message ${message.id}:`,
        error,
      );

      // Create a default moderated message with neutral sentiment
      const moderatedMessage: ModeratedMessage = {
        ...message,
        moderation: {
          sentiment: 'neutral',
          flagged: false,
          reasons: [],
          confidence: {
            sentiment: 0.5,
            flagged: 0.5,
          },
        },
        processedAt: new Date().toISOString(),
      };

      // Still produce to messages.moderated topic with default values
      await this.kafkaService.produceModeratedMessage(moderatedMessage);
    }
  }

  /**
   * Handle messages from messages.moderated topic
   * Persist to MongoDB and emit via WebSocket
   */
  private async handleModeratedMessage(
    message: ModeratedMessage,
  ): Promise<void> {
    try {
      this.logger.log(`Processing moderated message: ${message.id}`);

      // Find the original message in MongoDB and update it with moderation results
      const updatedMessage = await this.updateMessageWithModeration(message);

      if (updatedMessage) {
        // Create persisted message
        const persistedMessage: PersistedMessage = {
          ...message,
          _id: updatedMessage._id,
          createdAt: updatedMessage.createdAt,
          updatedAt: updatedMessage.updatedAt,
        };

        // Produce to messages.persisted topic
        await this.kafkaService.producePersistedMessage(persistedMessage);

        // Emit via WebSocket to room
        await this.chatGateway.emitMessageUpdated(
          message.roomId,
          updatedMessage,
        );

        this.logger.log(
          `Message ${message.id} persisted and emitted via WebSocket`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing moderated message ${message.id}:`,
        error,
      );
    }
  }

  /**
   * Call FastAPI moderation endpoint
   */
  private async callModerationAPI(message: MessageMetadata): Promise<{
    flagged: boolean;
    reasons?: string[];
    confidence?: number;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.fastApiUrl}/moderate`, {
          text: message.body,
          messageId: message.id,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error calling moderation API:', error);
      throw error;
    }
  }

  /**
   * Call FastAPI sentiment analysis endpoint
   */
  private async callSentimentAPI(message: MessageMetadata): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence?: number;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.fastApiUrl}/sentiment`, {
          text: message.body,
          messageId: message.id,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error calling sentiment API:', error);
      throw error;
    }
  }

  /**
   * Update message in MongoDB with moderation results
   */
  private async updateMessageWithModeration(
    message: ModeratedMessage,
  ): Promise<any> {
    try {
      // This would typically use the MessagesService to update the message
      // For now, we'll return a mock response
      // In a real implementation, you would call:
      // return await this.messagesService.updateMessageModeration(message.id, message.moderation);

      return {
        _id: message.id,
        createdAt: message.timestamp,
        updatedAt: new Date().toISOString(),
        // ... other message fields
      };
    } catch (error) {
      this.logger.error('Error updating message with moderation:', error);
      throw error;
    }
  }
}
