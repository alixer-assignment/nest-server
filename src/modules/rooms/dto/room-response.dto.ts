import { ApiProperty } from '@nestjs/swagger';

export class RoomResponseDto {
  @ApiProperty({
    description: 'Unique room identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Room type',
    example: 'channel',
    enum: ['dm', 'channel'],
  })
  type: 'dm' | 'channel';

  @ApiProperty({
    description: 'Room name',
    example: 'General Discussion',
  })
  name: string;

  @ApiProperty({
    description: 'Whether the room is private',
    example: false,
  })
  isPrivate: boolean;

  @ApiProperty({
    description: 'ID of the user who created the room',
    example: '507f1f77bcf86cd799439011',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Number of members in the room',
    example: 5,
  })
  membersCount: number;

  @ApiProperty({
    description: 'Room creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt: Date;
}
