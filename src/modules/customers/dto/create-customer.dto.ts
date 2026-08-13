import { IsString, IsOptional, IsInt, IsDecimal, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer full name', example: 'Amina Bello' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'amina@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ description: 'Physical address', example: '12 Gwarinpa, Abuja' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Loyalty points', default: 0, example: 0 })
  @IsOptional()
  @IsInt()
  @MinLength(0)
  @Type(() => Number)
  loyaltyPoints?: number;

  @ApiPropertyOptional({ description: 'Customer balance (credit/debit)', default: 0, example: 0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  balance?: number;
}