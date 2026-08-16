import { IsInt, IsOptional, IsEnum, IsNumber, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CheckoutPaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ description: 'Amount paid', example: 640000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class CheckoutCartDto {
  @ApiProperty({ description: 'Payment details' })
  @ValidateNested()
  @Type(() => CheckoutPaymentDto)
  payment!: CheckoutPaymentDto;

  @ApiPropertyOptional({ description: 'Customer ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;
}