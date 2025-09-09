import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoomDto {
  @ApiProperty({
    description: 'Room name',
    example: 'Updated Room Name',
    minLength: 1,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description: 'Whether the room is private',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrivate must be a boolean' })
  isPrivate?: boolean;
}
