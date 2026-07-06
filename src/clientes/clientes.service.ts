import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(@InjectRepository(Cliente) private readonly clientesRepo: Repository<Cliente>) {}

  async crear(dto: CreateClienteDto) {
    const existente = await this.clientesRepo.findOneBy({ nit: dto.nit });
    if (existente) throw new ConflictException('Ya existe un cliente con ese NIT');
    return this.clientesRepo.save(this.clientesRepo.create(dto));
  }

  listar() {
    return this.clientesRepo.find({ where: { activo: true } });
  }

  async obtener(id: number) {
    const cliente = await this.clientesRepo.findOneBy({ id });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async actualizar(id: number, dto: UpdateClienteDto) {
    const cliente = await this.obtener(id);
    if (dto.nit && dto.nit !== cliente.nit) {
      const duplicado = await this.clientesRepo.findOneBy({ nit: dto.nit });
      if (duplicado) throw new ConflictException('Ya existe un cliente con ese NIT');
    }
    Object.assign(cliente, dto);
    return this.clientesRepo.save(cliente);
  }

  async eliminar(id: number) {
    const cliente = await this.obtener(id);
    cliente.activo = false;
    await this.clientesRepo.save(cliente);
    return { mensaje: 'Cliente desactivado', id };
  }
}
