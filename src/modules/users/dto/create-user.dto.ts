import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name', example: 'Jane Doe' })
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

  @ApiProperty({ description: 'Valid email', example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password (min 8 chars, complexity)',
    example: 'Str0ngP@ss',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W])/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, and 1 digit or special character',
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ description: 'Role ID', example: 1 })
  @IsInt()
  roleId!: number;

  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  branchId!: number;

  @ApiPropertyOptional({
    description: 'Account status',
    enum: UserStatus,
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}