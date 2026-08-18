import {
  IsString,
  IsOptional,
  IsInt,
  IsDecimal,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Indomie Noodles' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit (internal)', example: 'ABC123' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode (UPC/EAN)', example: '123456789012' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @ApiPropertyOptional({ description: 'Supplier ID (optional)', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Branch ID (optional)', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement', example: 'Carton' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Cost price', example: 8500 })
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  costPrice!: number;

  @ApiProperty({ description: 'Selling price', example: 10500 })
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  sellingPrice!: number;

  @ApiPropertyOptional({ description: 'Wholesale price', example: 9500 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  wholesalePrice?: number;

  @ApiPropertyOptional({ description: 'Tax rate (%)', example: 7.5 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Default discount', example: 0 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Stock alert level (maps to reorder level)',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockAlertLevel?: number;

  @ApiPropertyOptional({ description: 'Track inventory flag', default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Product status', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}