import { IsInt, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignSubscriptionDto {
  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({ description: 'Plan ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  planId!: number;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-08-17' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-09-17' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'Grace period end date (YYYY-MM-DD)', example: '2026-09-20' })
  @IsOptional()
  @IsDateString()
  graceUntil?: string;
}