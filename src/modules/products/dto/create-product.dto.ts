import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Indomie Noodles' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'SKU', example: 'ABC123' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode', example: '123456789012' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @ApiPropertyOptional({ description: 'Supplier ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Branch ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ description: 'Unit', example: 'Carton' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ description: 'Cost price', example: 8500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  costPrice!: number;

  @ApiProperty({ description: 'Selling price', example: 10500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  sellingPrice!: number;

  @ApiPropertyOptional({ description: 'Wholesale price', example: 9500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  wholesalePrice?: number;

  @ApiPropertyOptional({ description: 'Tax rate (%)', example: 7.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Default discount', example: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Stock alert level', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stockAlertLevel?: number;

  @ApiPropertyOptional({ description: 'Track inventory', default: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ description: 'Status', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}