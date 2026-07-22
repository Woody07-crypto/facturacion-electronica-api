import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateEstablecimientoDto {
  @ApiProperty({ example: '0000', description: 'Código del establecimiento (ej. 0000 casa matriz)' })
  @Matches(/^\d{4}$/, { message: 'El código de establecimiento debe ser de 4 dígitos' })
  codigo: string;

  @ApiProperty({
    example: '01',
    description: 'Tipo libre en Fase 1; se validará contra CAT-009 en Fase 2',
  })
  @IsString()
  @IsNotEmpty()
  tipoEstablecimiento: string;

  @ApiProperty({ example: 'Casa matriz' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nombre: string;

  @ApiPropertyOptional({ example: 'Col. Escalón, San Salvador' })
  @IsOptional()
  @IsString()
  direccion?: string;
}
