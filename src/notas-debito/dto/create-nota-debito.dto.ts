import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateNotaDebitoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  facturaId: number;

  @ApiProperty({ example: 3, description: 'Serie de tipo NOTA_DEBITO' })
  @IsInt()
  serieId: number;

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  @IsPositive()
  monto: number;

  @ApiProperty({ example: 'Cargo por flete adicional no facturado' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  razon: string;
}
