import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateNotaCreditoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  facturaId: number;

  @ApiProperty({ example: 2, description: 'Serie de tipo NOTA_CREDITO' })
  @IsInt()
  serieId: number;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @IsPositive()
  monto: number;

  @ApiProperty({ example: 'Devolución de mercadería dañada' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  razon: string;
}
