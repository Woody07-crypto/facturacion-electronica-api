import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePagoDto {
  @ApiProperty({ example: 50.0 })
  @IsNumber()
  @IsPositive()
  monto: number;

  @ApiProperty({ example: 'TRANSFERENCIA', enum: ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE'] })
  @IsIn(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE'])
  metodo: string;

  @ApiPropertyOptional({ example: 'REF-88421' })
  @IsOptional()
  @IsString()
  referencia?: string;
}
