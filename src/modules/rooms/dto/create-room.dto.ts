import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Room type',
    example: 'channel',
    enum: ['dm', 'channel'],
  })
  @IsEnum(['dm', 'channel'], {
    message: 'Type must be either "dm" or "channel"',
  })
  type: 'dm' | 'channel';

  @ApiProperty({
    description: 'Room name',
    example: 'General Discussion',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Whether the room is private',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrivate must be a boolean' })
  isPrivate?: boolean;
}
