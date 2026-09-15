import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKycDocumentDto {
  @ApiProperty({ description: 'URL of uploaded NIN or CAC document' })
  @IsString()
  documentUrl!: string;
}