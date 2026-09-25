import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateInventoryReportDto {
  @ApiPropertyOptional({
    description: 'Branch ID (optional; omit for business-wide)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD) — filters movement activity',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}