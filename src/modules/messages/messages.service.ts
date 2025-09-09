import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';
import { KafkaService } from '../../common/kafka/kafka.service';
import { CacheService } from '../../common/cache/cache.service';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { LoggingService } from '../../common/logging/logging.service';
import { SanitizationService } from '../../common/sanitization/sanitization.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private kafkaService: KafkaService,
    private cacheService: CacheService,
    private rateLimitService: RateLimitService,
    private loggingService: LoggingService,
    private sanitizationService: SanitizationService,
  ) {}

  /**
   * Send a new message
   */
  async sendMessage(
    roomId: string,
    createMessageDto: CreateMessageDto,
    currentUser: UserDocument,
    clientIP?: string,
  ): Promise<MessageResponseDto> {
    // Check rate limits
    const userId = (currentUser._id as any).toString();

    // Check user rate limit
    const userRateLimit =
      await this.rateLimitService.checkMessageRateLimit(userId);
    if (!userRateLimit.allowed) {
      await this.loggingService.logSecurityEvent(
        'rate_limit_exceeded',
        userId,
        clientIP,
        undefined,
        {
          action: 'message_send',
          roomId,
          limit: 'user',
        },
      );
      throw new HttpException(
        `Rate limit exceeded. Try again in ${userRateLimit.retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check IP rate limit if IP is provided
    if (clientIP) {
      const ipRateLimit =
        await this.rateLimitService.checkIPRateLimit(clientIP);
      if (!ipRateLimit.allowed) {
        await this.loggingService.logSecurityEvent(
          'rate_limit_exceeded',
          userId,
          clientIP,
          undefined,
          {
            action: 'message_send',
            roomId,
            limit: 'ip',
          },
        );
        throw new HttpException(
          `Rate limit exceeded. Try again in ${ipRateLimit.retryAfter} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Check if room exists and user is a member
    const room = await this.roomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Check if user is a member of the room
    const isMember = await this.isRoomMember(roomId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }

    // Additional sanitization for message body
    const sanitizedBody = this.sanitizationService.sanitizeMessageBody(
      createMessageDto.body,
    );

    // Create message
    const message = new this.messageModel({
      roomId: new Types.ObjectId(roomId),
      senderId: currentUser._id,
      body: sanitizedBody,
      meta: {
        sentiment: 'neutral',
        flagged: false,
        reasons: [],
      },
    });

    const savedMessage = await message.save();
    const messageResponse = this.toMessageResponse(savedMessage);

    // Log message sent event
    await this.loggingService.logMessageEvent(
      'message_sent',
      userId,
      roomId,
      (savedMessage._id as any).toString(),
      clientIP,
      {
        bodyLength: sanitizedBody.length,
        originalBodyLength: createMessageDto.body.length,
        sanitized: sanitizedBody !== createMessageDto.body,
      },
    );

    // Cache recent messages for the room
    await this.cacheRecentMessages(roomId, messageResponse);

    // Produce message to Kafka
    try {
      await this.kafkaService.produceInboundMessage({
        id: (savedMessage._id as any).toString(),
        roomId: roomId,
        senderId: userId,
        body: createMessageDto.body,
        timestamp: (savedMessage as any).createdAt.toISOString(),
        type: 'message.sent' as any,
      });
    } catch (error) {
      console.error('Failed to produce message to Kafka:', error);
      // Don't fail the request if Kafka fails
    }

    return messageResponse;
  }

  /**
   * Get messages for a room with pagination
   */
  async getMessages(
    roomId: string,
    query: MessagesQueryDto,
    currentUser: UserDocument,
  ): Promise<{
    messages: MessageResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    // Check if room exists and user is a member
    const room = await this.roomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const isMember = await this.isRoomMember(
      roomId,
      (currentUser._id as any).toString(),
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }

    const { page = 1, limit = 20, cursor } = query;

    // Try to get recent messages from cache first (only for first page)
    if (page === 1 && !cursor) {
      const cachedMessages = await this.cacheService.getRecentMessages(roomId);
      if (cachedMessages && cachedMessages.length > 0) {
        // Return cached messages for first page
        const total = await this.messageModel
          .countDocuments({
            roomId: new Types.ObjectId(roomId),
            deletedAt: null,
          })
          .exec();

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
          messages: cachedMessages.slice(0, limit),
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev,
        };
      }
    }

    // Fallback to database query
    const skip = (page - 1) * limit;

    let queryFilter: any = {
      roomId: new Types.ObjectId(roomId),
      deletedAt: null, // Only show non-deleted messages
    };

    // Cursor-based pagination
    if (cursor) {
      const cursorMessage = await this.messageModel.findById(cursor).exec();
      if (!cursorMessage) {
        throw new BadRequestException('Invalid cursor');
      }
      queryFilter.createdAt = { $lt: (cursorMessage as any).createdAt };
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name email avatarUrl')
        .exec(),
      this.messageModel
        .countDocuments({
          roomId: new Types.ObjectId(roomId),
          deletedAt: null,
        })
        .exec(),
    ]);

    const messageResponses = messages.map((message) =>
      this.toMessageResponse(message),
    );
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Cache recent messages for first page
    if (page === 1 && !cursor) {
      await this.cacheService.cacheRecentMessages(roomId, messageResponses);
    }

    return {
      messages: messageResponses,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Update a message
   */
  async updateMessage(
    messageId: string,
    updateMessageDto: UpdateMessageDto,
    currentUser: UserDocument,
  ): Promise<MessageResponseDto> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if message is deleted
    if (message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is the sender
    if (
      (message.senderId as any).toString() !==
      (currentUser._id as any).toString()
    ) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Update message
    const updatedMessage = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          body: updateMessageDto.body,
          editedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true, runValidators: true },
      )
      .exec();

    return this.toMessageResponse(updatedMessage!);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(
    messageId: string,
    currentUser: UserDocument,
  ): Promise<{ message: string }> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if message is already deleted
    if (message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is the sender
    if (
      (message.senderId as any).toString() !==
      (currentUser._id as any).toString()
    ) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete message
    await this.messageModel.findByIdAndUpdate(messageId, {
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    return { message: 'Message deleted successfully' };
  }

  /**
   * Get a single message by ID
   */
  async getMessageById(
    messageId: string,
    currentUser: UserDocument,
  ): Promise<MessageResponseDto> {
    const message = await this.messageModel
      .findById(messageId)
      .populate('senderId', 'name email avatarUrl')
      .exec();

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is a member of the room
    const isMember = await this.isRoomMember(
      (message.roomId as any).toString(),
      (currentUser._id as any).toString(),
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }

    return this.toMessageResponse(message);
  }

  /**
   * Check if user is a member of a room
   */
  private async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    // This would typically use the RoomsService, but to avoid circular dependency,
    // we'll check directly with the membership model
    const { MembershipSchema } = await import(
      '../rooms/schemas/membership.schema'
    );
    const membershipModel = this.messageModel.db.model(
      'Membership',
      MembershipSchema,
    );

    const membership = await membershipModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    return !!membership;
  }

  /**
   * Cache recent messages for a room
   */
  private async cacheRecentMessages(
    roomId: string,
    message: MessageResponseDto,
  ): Promise<void> {
    try {
      // Get existing cached messages
      let cachedMessages =
        (await this.cacheService.getRecentMessages(roomId)) || [];

      // Add new message to the beginning
      cachedMessages.unshift(message);

      // Keep only the last 50 messages in cache
      if (cachedMessages.length > 50) {
        cachedMessages = cachedMessages.slice(0, 50);
      }

      // Update cache
      await this.cacheService.cacheRecentMessages(roomId, cachedMessages);
    } catch (error) {
      console.error('Error caching recent messages:', error);
      // Don't fail the request if caching fails
    }
  }

  /**
   * Convert MessageDocument to MessageResponseDto
   */
  private toMessageResponse(message: MessageDocument): MessageResponseDto {
    return {
      _id: (message._id as any).toString(),
      roomId: (message.roomId as any).toString(),
      senderId: (message.senderId as any).toString(),
      body: message.body,
      meta: {
        sentiment: message.meta.sentiment,
        flagged: message.meta.flagged,
        reasons: message.meta.reasons,
      },
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      createdAt: (message as any).createdAt,
      updatedAt: (message as any).updatedAt,
    };
  }
}
