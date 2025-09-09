import { IsString, IsOptional, IsMongoId, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Client to Server Events
export class JoinRoomDto {
  @ApiProperty({
    description: 'Room ID to join',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Room ID must be a string' })
  @IsMongoId({ message: 'Room ID must be a valid MongoDB ObjectId' })
  roomId: string;
}

export class LeaveRoomDto {
  @ApiProperty({
    description: 'Room ID to leave',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Room ID must be a string' })
  @IsMongoId({ message: 'Room ID must be a valid MongoDB ObjectId' })
  roomId: string;
}

export class TypingDto {
  @ApiProperty({
    description: 'Room ID where user is typing',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Room ID must be a string' })
  @IsMongoId({ message: 'Room ID must be a valid MongoDB ObjectId' })
  roomId: string;

  @ApiProperty({
    description: 'Whether user is typing',
    example: true,
  })
  @IsBoolean({ message: 'Is typing must be a boolean' })
  isTyping: boolean;
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Room ID to send message to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Room ID must be a string' })
  @IsMongoId({ message: 'Room ID must be a valid MongoDB ObjectId' })
  roomId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone!',
  })
  @IsString({ message: 'Message body must be a string' })
  body: string;
}

export class ReadReceiptDto {
  @ApiProperty({
    description: 'Room ID where message was read',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Room ID must be a string' })
  @IsMongoId({ message: 'Room ID must be a valid MongoDB ObjectId' })
  roomId: string;

  @ApiProperty({
    description: 'Message ID that was read',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Message ID must be a string' })
  @IsMongoId({ message: 'Message ID must be a valid MongoDB ObjectId' })
  messageId?: string;
}

// Server to Client Events
export class MessageCreatedEvent {
  @ApiProperty({
    description: 'Message data',
  })
  message: any;

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;
}

export class MessageUpdatedEvent {
  @ApiProperty({
    description: 'Updated message data',
  })
  message: any;

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;
}

export class MessageDeletedEvent {
  @ApiProperty({
    description: 'Deleted message ID',
    example: '507f1f77bcf86cd799439011',
  })
  messageId: string;

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;
}

export class TypingEvent {
  @ApiProperty({
    description: 'User ID who is typing',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;

  @ApiProperty({
    description: 'Whether user is typing',
    example: true,
  })
  isTyping: boolean;
}

export class PresenceEvent {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'User status',
    example: 'online',
    enum: ['online', 'offline'],
  })
  status: 'online' | 'offline';

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;
}

export class ReadReceiptEvent {
  @ApiProperty({
    description: 'User ID who read the message',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;

  @ApiProperty({
    description: 'Message ID that was read',
    example: '507f1f77bcf86cd799439011',
  })
  messageId: string;

  @ApiProperty({
    description: 'Read timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  readAt: Date;
}
