import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Unique user identifier',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User role',
    example: 'user',
    enum: ['user', 'admin'],
  })
  role: 'user' | 'admin';
}
