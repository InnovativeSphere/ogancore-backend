import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateFinancialReportDto {
  @ApiPropertyOptional({
    description: 'Branch ID (optional; omit for business-wide)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD) — preferred',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD) — preferred',
    example: '2026-09-30',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Deprecated alias for dateFrom (kept for frontend compatibility)',
    deprecated: true,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Deprecated alias for dateTo (kept for frontend compatibility)',
    deprecated: true,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}