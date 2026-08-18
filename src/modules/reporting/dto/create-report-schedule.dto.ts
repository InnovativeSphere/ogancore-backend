import { IsString, IsInt, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReportScheduleDto {
  @ApiProperty({ description: 'Report type: sales | inventory | financial' })
  @IsString()
  reportType!: string;

  @ApiProperty({ description: 'Frequency: DAILY | WEEKLY | MONTHLY' })
  @IsString()
  frequency!: string;

  @ApiPropertyOptional({ description: 'Time in HH:MM (24h)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'dailyTime must be in HH:MM format' })
  dailyTime?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ description: 'Email recipient' })
  @IsOptional()
  @IsString()
  emailRecipient?: string;
}