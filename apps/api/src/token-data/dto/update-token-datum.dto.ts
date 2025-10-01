import { PartialType } from '@nestjs/mapped-types';
import { CreateTokenDatumDto } from './create-token-datum.dto';

export class UpdateTokenDatumDto extends PartialType(CreateTokenDatumDto) {}
