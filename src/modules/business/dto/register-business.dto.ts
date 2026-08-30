import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class RegisterBusinessDto {
  @ApiProperty({ description: 'Business name', example: 'Dale Enterprises' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  businessName!: string;

  @ApiProperty({ enum: BusinessType, example: 'BUSINESS' })
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @ApiPropertyOptional({ description: 'Business email' })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @ApiPropertyOptional({ description: 'Business phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessPhone?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'CAC registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cacRegistrationNumber?: string;

  @ApiPropertyOptional({ description: 'National Identification Number (NIN)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nin?: string;

  @ApiProperty({ description: 'Owner full name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerFullName!: string;

  @ApiProperty({ description: 'Owner email (also used for login)' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ description: 'Owner password', example: 'Str0ngP@ss' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  ownerPassword!: string;

  @ApiPropertyOptional({ description: 'Owner phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ownerPhone?: string;

  @ApiPropertyOptional({ description: 'Default branch name', example: 'Main Branch' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string;

  @ApiPropertyOptional({ description: 'Branch address' })
  @IsOptional()
  @IsString()
  branchAddress?: string;
}