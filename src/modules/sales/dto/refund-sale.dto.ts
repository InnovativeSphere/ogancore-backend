import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefundSaleDto {
  @ApiPropertyOptional({ description: 'Reason for refund', example: 'Product returned' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}