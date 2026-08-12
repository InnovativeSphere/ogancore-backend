import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TransferDto {
  @ApiProperty({ description: 'Product ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId!: number;

  @ApiProperty({ description: 'Source branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  fromBranchId!: number;

  @ApiProperty({ description: 'Destination branch ID', example: 2 })
  @IsInt()
  @Type(() => Number)
  toBranchId!: number;

  @ApiProperty({ description: 'Quantity to transfer (positive)', example: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional note', example: 'Restocking Lagos branch' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}