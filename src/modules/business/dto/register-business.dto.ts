import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class RegisterBusinessDto {
  @ApiProperty({ description: 'Business name', example: 'Dale Enterprises' })
  @IsString()
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
  cacRegistrationNumber?: string;

  @ApiPropertyOptional({ description: 'National Identification Number (NIN)' })
  @IsOptional()
  @IsString()
  nin?: string;

  @ApiProperty({ description: 'Owner full name' })
  @IsString()
  ownerFullName!: string;

  @ApiProperty({ description: 'Owner email (also used for login)' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ description: 'Owner password', example: 'Str0ngP@ss' })
  @IsString()
  @MinLength(8)
  ownerPassword!: string;

  @ApiPropertyOptional({ description: 'Owner phone' })
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @ApiPropertyOptional({ description: 'Default branch name', example: 'Main Branch' })
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiPropertyOptional({ description: 'URL of uploaded NIN or CAC document' })
  @IsOptional()
  @IsString()
  kycDocumentUrl?: string;

  @ApiPropertyOptional({ description: 'Branch address' })
  @IsOptional()
  @IsString()
  branchAddress?: string;

  @ApiPropertyOptional({ description: 'Plan ID to subscribe to during onboarding' })
  @IsOptional()
  @IsInt()
  planId?: number;
}