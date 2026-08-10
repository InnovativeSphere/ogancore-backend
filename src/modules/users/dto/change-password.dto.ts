import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'OldP@ssw0rd' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password (min 8 chars, complexity)',
    example: 'NewStr0ngP@ss',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W])/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, and 1 digit or special character',
  })
  newPassword!: string;
}