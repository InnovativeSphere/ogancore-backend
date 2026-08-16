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
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateSaleItemDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiPropertyOptional({ description: 'Product name (for reference)', example: 'Indomie Noodles' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productName?: string;

  @ApiPropertyOptional({ description: 'SKU (for reference)', example: 'ABC123' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({ description: 'Quantity sold', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Unit price (defaults to product selling price if omitted)', example: 10500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Per-item discount (flat)', example: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ description: 'Per-item tax (flat)', example: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  tax?: number;
}

export class CreatePaymentEntryDto {
  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ description: 'Amount paid', example: 10500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ description: 'Reference number (e.g., transfer reference)', example: 'TRF-112233' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceNumber?: string;
}

export class CreateSaleDto {
  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiPropertyOptional({ description: 'Customer ID (required for credit sales)', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({ description: 'POS terminal ID', example: 'pos_01' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  posId?: string;

  @ApiPropertyOptional({ description: 'Session ID', example: 'SES-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Sale notes', example: 'Walk-in customer' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Single payment method (used if payments array is not provided)', enum: PaymentMethod, example: 'CASH' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Sale items', type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @ApiPropertyOptional({ description: 'Split payments (optional; if omitted, a single full payment is created using paymentMethod)', type: [CreatePaymentEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentEntryDto)
  payments?: CreatePaymentEntryDto[];
}