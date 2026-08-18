import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenewSubscriptionDto {
  @ApiProperty({ description: 'New end date (YYYY-MM-DD)', example: '2026-12-17' })
  @IsDateString()
  endDate!: string;
}