import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Beverages' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  categoryName!: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Drinks, teas, coffees, and juices' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}