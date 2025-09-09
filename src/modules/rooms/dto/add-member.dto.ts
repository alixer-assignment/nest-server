import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({
    description: 'User ID to add to the room',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'userId must be a string' })
  @IsMongoId({ message: 'userId must be a valid MongoDB ObjectId' })
  userId: string;

  @ApiProperty({
    description: 'Role to assign to the new member',
    example: 'member',
    enum: ['owner', 'moderator', 'member'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['owner', 'moderator', 'member'], {
    message: 'Role must be one of: owner, moderator, member',
  })
  role?: 'owner' | 'moderator' | 'member';
}
