import { PartialType } from '@nestjs/swagger';
import { CreateEmisorDto } from './create-emisor.dto';

export class UpdateEmisorDto extends PartialType(CreateEmisorDto) {}
