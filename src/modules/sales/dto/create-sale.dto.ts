import {
  IsInt,
  IsOptional,
  IsNumber,
  IsEnum,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

// Individual item within a sale
export class CreateSaleItemDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Quantity sold', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Unit price (defaults to product selling price if omitted)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  unitPrice?: number;
}

// Individual payment within a sale
export class CreatePaymentEntryDto {
  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ description: 'Amount paid', example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ description: 'Reference number (e.g., transfer reference)', example: 'TRF-112233' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceNumber?: string;
}

// Main sale creation DTO
export class CreateSaleDto {
  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiPropertyOptional({ description: 'Customer ID (required for credit sales)', example: 5 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({ description: 'Discount amount (flat)', example: 200, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ description: 'Tax amount (flat)', example: 150, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  tax?: number;

  @ApiProperty({ description: 'Sale items', type: [CreateSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @ApiProperty({ description: 'Payments received', type: [CreatePaymentEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentEntryDto)
  payments!: CreatePaymentEntryDto[];
}