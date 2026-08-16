import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: 'BANK_TRANSFER' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ description: 'Amount to pay', example: 150 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ description: 'Reference number', example: 'TRF-445566' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reference?: string;
}