import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StockOutDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Branch ID losing stock', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({ description: 'Quantity removed (positive)', example: 3 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional note', example: 'Damaged stock' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}