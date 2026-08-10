import { IsString, IsEmail, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ description: 'Full name of the user', example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  fullName!: string;

  @ApiProperty({ description: 'Unique username', example: 'jane_doe' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  username!: string;

  @ApiProperty({ description: 'Valid email address', example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit or special char)',
    example: 'Str0ngP@ss',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W])/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 digit or special character',
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}