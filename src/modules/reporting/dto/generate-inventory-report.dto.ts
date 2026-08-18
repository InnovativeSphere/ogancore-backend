import { IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateInventoryReportDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;
}