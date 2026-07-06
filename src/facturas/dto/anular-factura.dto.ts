import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AnularFacturaDto {
  @ApiProperty({ example: 'Error en datos del cliente, se emitirá nueva factura' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'La razón de anulación debe tener al menos 5 caracteres' })
  razon: string;
}
