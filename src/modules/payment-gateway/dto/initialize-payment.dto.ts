import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InitializePaymentDto {
  @ApiPropertyOptional({ description: 'Subscription ID to pay for', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  subscriptionId?: number;

  @ApiPropertyOptional({ description: 'Plan ID to subscribe to', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  planId?: number;

  @ApiPropertyOptional({ description: 'Amount in kobo if overriding invoice amount', example: 500000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Type(() => Number)
  amount?: number;
}