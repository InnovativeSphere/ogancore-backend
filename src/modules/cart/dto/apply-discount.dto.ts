import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApplyDiscountDto {
  @ApiProperty({ description: 'Discount type', enum: ['FIXED', 'PERCENTAGE'] })
  @IsEnum(['FIXED', 'PERCENTAGE'])
  type!: 'FIXED' | 'PERCENTAGE';

  @ApiProperty({ description: 'Discount value', example: 10000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  value!: number;

  @ApiPropertyOptional({ description: 'Reason for discount', example: 'Customer discount' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}