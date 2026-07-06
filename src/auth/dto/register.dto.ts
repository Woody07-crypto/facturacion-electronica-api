import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'admin@ici.com.sv' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secreto123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Administrador ICI' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
