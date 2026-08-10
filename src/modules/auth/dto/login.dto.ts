import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Registered email', example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Account password', example: 'Str0ngP@ss' })
  @IsString()
  password!: string;
}