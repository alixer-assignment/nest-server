import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'User role',
    example: 'admin',
    enum: ['user', 'admin'],
  })
  @IsEnum(['user', 'admin'], {
    message: 'Role must be either "user" or "admin"',
  })
  role: 'user' | 'admin';
}
