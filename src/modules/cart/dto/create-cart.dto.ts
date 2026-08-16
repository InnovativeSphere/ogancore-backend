import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCartDto {
  @ApiProperty({ description: 'Branch ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  branchId!: number;

  @ApiPropertyOptional({ description: 'POS ID', example: 'POS-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  posId?: string;

  @ApiPropertyOptional({ description: 'Session ID', example: 'SES-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Cashier ID (defaults to current user)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  cashierId?: number;

  @ApiPropertyOptional({ description: 'Customer ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;
}