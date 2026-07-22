import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateEmisorDto {
  @ApiProperty({ example: '0614-290313-101-3', description: 'NIT formato ####-######-###-#' })
  @Matches(/^\d{4}-\d{6}-\d{3}-\d$/, { message: 'El NIT debe tener el formato 0614-290313-101-3' })
  nit: string;

  @ApiProperty({ example: '123456-7' })
  @IsString()
  @IsNotEmpty()
  nrc: string;

  @ApiProperty({ example: 'Comercializadora Demo S.A. de C.V.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  nombre: string;

  @ApiPropertyOptional({ example: 'Demo Store' })
  @IsOptional()
  @IsString()
  nombreComercial?: string;

  @ApiPropertyOptional({ example: '46452', description: 'Código de actividad económica (CAT oficial en Fase 2)' })
  @IsOptional()
  @IsString()
  codActividad?: string;

  @ApiPropertyOptional({ example: 'Venta al por menor de materiales de construcción' })
  @IsOptional()
  @IsString()
  descActividad?: string;

  @ApiPropertyOptional({ example: '2222-2222' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 'facturacion@demo.com.sv' })
  @IsOptional()
  @IsEmail()
  correo?: string;

  @ApiPropertyOptional({ example: 'San Salvador' })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional({ example: 'San Salvador' })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ example: 'Col. Escalón, Calle Principal #10' })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional({ example: '00', enum: ['00', '01'], description: '00 = pruebas MH (default), 01 = producción' })
  @IsOptional()
  @IsIn(['00', '01'])
  ambientePorDefecto?: string;
}
