import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@ici.com.sv' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secreto123!' })
  @IsString()
  password: string;
}
