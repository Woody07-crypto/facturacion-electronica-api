import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existente = await this.usuariosRepo.findOneBy({ email: dto.email });
    if (existente) throw new ConflictException('El correo ya está registrado');

    const totalUsuarios = await this.usuariosRepo.count();
    const usuario = this.usuariosRepo.create({
      email: dto.email,
      nombre: dto.nombre,
      password: bcrypt.hashSync(dto.password, 10),
      rol: totalUsuarios === 0 ? 'ADMIN' : 'VENTAS',
    });
    const guardado = await this.usuariosRepo.save(usuario);
    return { id: guardado.id, email: guardado.email, nombre: guardado.nombre, rol: guardado.rol };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosRepo.findOneBy({ email: dto.email });
    if (!usuario || !bcrypt.compareSync(dto.password, usuario.password)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const payload = { sub: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
    return { access_token: this.jwtService.sign(payload), usuario: payload };
  }
}
