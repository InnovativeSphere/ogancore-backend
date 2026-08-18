import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RequisitionStatus } from '@prisma/client';

export class UpdateRequisitionDto {
  @ApiPropertyOptional({ enum: RequisitionStatus })
  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @ApiPropertyOptional({ description: 'Quantity requested', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Reason updated' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Product ID change' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  productId?: number;

  @ApiPropertyOptional({ description: 'Branch ID change' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;
}