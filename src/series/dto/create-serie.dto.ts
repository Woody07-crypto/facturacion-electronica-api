import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateSerieDto {
  @ApiProperty({ example: 'FACTURA', enum: ['FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO'] })
  @IsIn(['FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO'])
  tipoDocumento: string;

  @ApiProperty({ example: 'FAC-2026' })
  @IsString()
  @IsNotEmpty()
  prefijo: string;
}
