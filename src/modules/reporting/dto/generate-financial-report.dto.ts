import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateFinancialReportDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  endDate!: string;
}