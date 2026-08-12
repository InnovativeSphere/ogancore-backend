import {
  IsString, IsOptional, IsInt, IsDecimal, IsPositive, Min, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Coca-Cola 50cl' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  productName!: string;

  @ApiProperty({ description: 'Category ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @ApiPropertyOptional({ description: 'Supplier ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Barcode (UPC/EAN)', example: '123456789012' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit (internal)', example: 'CC-50CL' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cost price', example: 150.00 })
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  costPrice!: number;

  @ApiProperty({ description: 'Selling price', example: 200.00 })
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  sellingPrice!: number;

  @ApiPropertyOptional({ description: 'Reorder level', default: 0, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number;

  @ApiPropertyOptional({ description: 'Initial status', default: 'active', example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}