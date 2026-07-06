import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({ example: 'Constructora Salvadoreña S.A. de C.V.' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: '0614-123456-101-2', description: 'NIT formato ####-######-###-#' })
  @Matches(/^\d{4}-\d{6}-\d{3}-\d$/, { message: 'El NIT debe tener el formato 0614-123456-101-2' })
  nit: string;

  @ApiProperty({ example: '123456-7' })
  @IsString()
  @IsNotEmpty()
  nrc: string;

  @ApiProperty({ example: 'Venta de materiales de construcción' })
  @IsString()
  @IsNotEmpty()
  giro: string;

  @ApiPropertyOptional({ example: 'Calle Los Sisimiles #3181, San Salvador' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ example: 'compras@constructora.com.sv' })
  @IsOptional()
  @IsEmail()
  correo?: string;
}
