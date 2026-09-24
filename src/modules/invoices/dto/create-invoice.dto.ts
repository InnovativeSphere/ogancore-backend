import {
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsString,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
  @ApiPropertyOptional({
    description:
      'Only required if the caller is a platform admin (SUPER_ADMIN / IT_ADMIN). Business admins inherit from their branch.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  businessId?: number;

  @ApiPropertyOptional({ enum: InvoiceType, default: InvoiceType.GENERAL })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({ description: 'Branch ID (optional)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ description: 'Customer ID (optional)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({ description: 'Supplier ID (optional)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({
    description: 'Free-text note on the invoice',
    example: 'Consulting services for September',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  narration?: string;

  @ApiProperty({ description: 'Pre-tax, pre-discount amount', example: 100000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ description: 'Tax amount', default: 0, example: 7500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  tax?: number;

  @ApiPropertyOptional({ description: 'Discount amount', default: 0, example: 5000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ description: 'Due date (YYYY-MM-DD)', example: '2026-10-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
    description: 'Invoice status. Defaults to DRAFT.',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}