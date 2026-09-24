import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class VoidInvoiceDto {
  @ApiPropertyOptional({
    description: 'Reason for voiding',
    example: 'Customer cancelled the order',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}