import { PartialType, OmitType } from '@nestjs/swagger';
import { RegisterBusinessDto } from './register-business.dto';

export class UpdateBusinessDto extends PartialType(
  OmitType(RegisterBusinessDto, [
    'ownerFullName',
    'ownerEmail',
    'ownerPassword',
    'cacRegistrationNumber',
    'nin',
  ] as const),
) {}