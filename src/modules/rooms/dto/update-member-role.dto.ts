import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    example: 'moderator',
    enum: ['owner', 'moderator', 'member'],
  })
  @IsEnum(['owner', 'moderator', 'member'], {
    message: 'Role must be one of: owner, moderator, member',
  })
  role: 'owner' | 'moderator' | 'member';
}
