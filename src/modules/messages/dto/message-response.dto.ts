import { ApiProperty } from '@nestjs/swagger';

export class MessageMetaDto {
  @ApiProperty({
    description: 'Message sentiment analysis result',
    example: 'positive',
    enum: ['positive', 'negative', 'neutral'],
  })
  sentiment: 'positive' | 'negative' | 'neutral';

  @ApiProperty({
    description: 'Whether the message has been flagged',
    example: false,
  })
  flagged: boolean;

  @ApiProperty({
    description: 'Reasons for flagging (if any)',
    example: ['spam', 'inappropriate'],
    type: [String],
  })
  reasons: string[];
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Unique message identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Room ID where the message was sent',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;

  @ApiProperty({
    description: 'User ID who sent the message',
    example: '507f1f77bcf86cd799439011',
  })
  senderId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone! How is everyone doing today?',
  })
  body: string;

  @ApiProperty({
    description: 'Message metadata',
    type: MessageMetaDto,
  })
  meta: MessageMetaDto;

  @ApiProperty({
    description: 'When the message was last edited',
    example: '2024-01-01T12:00:00.000Z',
    nullable: true,
  })
  editedAt?: Date;

  @ApiProperty({
    description: 'When the message was deleted (soft delete)',
    example: '2024-01-01T12:00:00.000Z',
    nullable: true,
  })
  deletedAt?: Date;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt: Date;
}
