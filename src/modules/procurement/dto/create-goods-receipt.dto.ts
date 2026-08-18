import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGoodsReceiptDto {
  @ApiProperty({ description: 'Purchase Order ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  orderId!: number;

  @ApiProperty({ description: 'Product ID (should match order product)', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Quantity received', example: 50 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Receipt notes', example: 'Delivered in good condition' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}