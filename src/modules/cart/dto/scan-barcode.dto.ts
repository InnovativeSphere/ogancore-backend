import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ScanBarcodeDto {
  @ApiProperty({ description: 'Barcode', example: '1234567890123' })
  @IsString()
  @MaxLength(50)
  barcode!: string;

  @ApiPropertyOptional({ description: 'Quantity', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Branch ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;
}