import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlanInterval } from '@prisma/client';

export class CreatePlanDto {
  @ApiProperty({ description: 'Plan name', example: 'Pro' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ enum: PlanInterval, example: 'MONTHLY' })
  @IsEnum(PlanInterval)
  interval!: PlanInterval;

  @ApiProperty({ description: 'Price (NGN)', example: 25000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({ description: 'Features list', example: 'Includes 5 branches, 10 users' })
  @IsOptional()
  @IsString()
  features?: string;
}