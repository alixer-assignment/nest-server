import { ApiProperty } from '@nestjs/swagger';

export class MembershipResponseDto {
  @ApiProperty({
    description: 'Unique membership identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Room ID',
    example: '507f1f77bcf86cd799439011',
  })
  roomId: string;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'Member role in the room',
    example: 'member',
    enum: ['owner', 'moderator', 'member'],
  })
  role: 'owner' | 'moderator' | 'member';

  @ApiProperty({
    description: 'When the user joined the room',
    example: '2024-01-01T00:00:00.000Z',
  })
  joinedAt: Date;

  @ApiProperty({
    description: 'ID of the last read message',
    example: '507f1f77bcf86cd799439011',
    nullable: true,
  })
  lastReadMessageId?: string;

  @ApiProperty({
    description: 'When the user was last seen in the room',
    example: '2024-01-01T12:00:00.000Z',
  })
  lastSeenAt: Date;
}
