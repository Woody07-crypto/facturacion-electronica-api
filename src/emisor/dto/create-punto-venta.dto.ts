import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreatePuntoVentaDto {
  @ApiProperty({ example: '001', description: 'Código del punto de venta (3 dígitos)' })
  @Matches(/^\d{3}$/, { message: 'El código de punto de venta debe ser de 3 dígitos' })
  codigo: string;

  @ApiProperty({ example: 'Caja principal' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nombre: string;
}
