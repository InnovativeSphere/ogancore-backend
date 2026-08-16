import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity', example: 3 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity!: number;
}