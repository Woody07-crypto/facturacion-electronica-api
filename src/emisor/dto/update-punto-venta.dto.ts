import { PartialType } from '@nestjs/swagger';
import { CreatePuntoVentaDto } from './create-punto-venta.dto';

export class UpdatePuntoVentaDto extends PartialType(CreatePuntoVentaDto) {}
