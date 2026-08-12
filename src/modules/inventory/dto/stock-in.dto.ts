import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StockInDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Branch ID receiving stock', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({ description: 'Quantity received (positive)', example: 50 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional note', example: 'PO #123' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}