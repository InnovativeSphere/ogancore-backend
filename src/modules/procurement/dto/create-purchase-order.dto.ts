import { IsInt, IsOptional, IsString, IsDateString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Requisition ID (if created from requisition)', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  requisitionId?: number;

  @ApiProperty({ description: 'Supplier ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  supplierId!: number;

  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Quantity ordered', example: 50 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Expected delivery date', example: '2026-08-25' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ description: 'Notes', example: 'Urgent order' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}