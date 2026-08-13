import { IsString, IsOptional, IsInt, IsNumber, IsDateString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiProperty({ description: 'Expense name', example: 'Generator Diesel' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  expenseName!: string;

  @ApiPropertyOptional({ description: 'Expense category', example: 'Utilities' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({ description: 'Amount spent', example: 15000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @MinLength(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ description: 'Date of expense (YYYY-MM-DD)', example: '2026-08-13' })
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional({ description: 'Additional details', example: '25 litres of diesel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}