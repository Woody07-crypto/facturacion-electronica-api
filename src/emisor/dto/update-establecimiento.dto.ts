import { PartialType } from '@nestjs/swagger';
import { CreateEstablecimientoDto } from './create-establecimiento.dto';

export class UpdateEstablecimientoDto extends PartialType(CreateEstablecimientoDto) {}
