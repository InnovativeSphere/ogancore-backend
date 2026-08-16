import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaymentMethod, ExpenseStatus } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({ description: 'Expense category ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @ApiProperty({ description: 'Expense title', example: 'Generator Diesel' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  title!: string;

  @ApiPropertyOptional({ description: 'Additional details', example: '25 litres of diesel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Amount spent', example: 15000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, example: 'BANK_TRANSFER' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment reference', example: 'TRF-998877' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reference?: string;

  @ApiPropertyOptional({ description: 'Attachment URL', example: 'https://example.com/receipt.jpg' })
  @IsOptional()
  @IsString()
  attachment?: string;

  @ApiProperty({ description: 'Date of expense (YYYY-MM-DD)', example: '2026-08-15' })
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional({
    description: 'Expense status',
    enum: ExpenseStatus,
    default: 'PENDING',
  })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;
}