import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'JWT refresh token for obtaining new access token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDQwNjcyMDAsImV4cCI6MTcwNDY3MjAwMH0.example',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
