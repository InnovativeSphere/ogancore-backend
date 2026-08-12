import { IsInt, IsOptional, IsString, NotEquals, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({
    description: 'Quantity change (positive to add, negative to subtract, not zero)',
    example: -2,
  })
  @IsInt()
  @NotEquals(0, { message: 'quantityChange must not be zero' })
  @Type(() => Number)
  quantityChange!: number;

  @ApiPropertyOptional({ description: 'Reason for adjustment', example: 'Stock count correction' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}