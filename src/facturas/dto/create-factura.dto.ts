import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested,
} from 'class-validator';

export class LineaFacturaDto {
  @ApiProperty({ example: 'Taladro percutor INGCO 850W' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsPositive()
  cantidad: number;

  @ApiProperty({ example: 45.9, description: 'Precio unitario sin IVA' })
  @IsNumber()
  @IsPositive()
  precioUnitario: number;
}

export class CreateFacturaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  clienteId: number;

  @ApiProperty({ example: 1, description: 'Serie de tipo FACTURA' })
  @IsInt()
  serieId: number;

  @ApiPropertyOptional({ example: 30, description: 'Días de crédito para calcular vencimiento (0 = contado)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  diasCredito?: number;

  @ApiProperty({ type: [LineaFacturaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaFacturaDto)
  lineas: LineaFacturaDto[];
}
