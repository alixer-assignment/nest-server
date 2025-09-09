import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone! How is everyone doing today?',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString({ message: 'Body must be a string' })
  @MinLength(1, { message: 'Body must be at least 1 character long' })
  @MaxLength(2000, { message: 'Body must not exceed 2000 characters' })
  body: string;
}
