import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmisorDto } from './dto/create-emisor.dto';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { CreatePuntoVentaDto } from './dto/create-punto-venta.dto';
import { UpdateEmisorDto } from './dto/update-emisor.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';
import { UpdatePuntoVentaDto } from './dto/update-punto-venta.dto';
import { Emisor } from './emisor.entity';
import { Establecimiento } from './establecimiento.entity';
import { PuntoVenta } from './punto-venta.entity';

@Injectable()
export class EmisorService {
  constructor(
    @InjectRepository(Emisor) private readonly emisoresRepo: Repository<Emisor>,
    @InjectRepository(Establecimiento) private readonly establecimientosRepo: Repository<Establecimiento>,
    @InjectRepository(PuntoVenta) private readonly puntosRepo: Repository<PuntoVenta>,
    private readonly config: ConfigService,
  ) {}

  private ambienteDefault() {
    return this.config.get<string>('DTE_AMBIENTE') || '00';
  }

  async crearEmisor(dto: CreateEmisorDto) {
    const activoExistente = await this.emisoresRepo.findOneBy({ activo: true });
    if (activoExistente) {
      throw new ConflictException(
        'Ya existe un emisor activo. Desactívelo antes de registrar otro (Fase 1: un solo emisor activo).',
      );
    }
    const nitDuplicado = await this.emisoresRepo.findOneBy({ nit: dto.nit });
    if (nitDuplicado) throw new ConflictException('Ya existe un emisor con ese NIT');

    return this.emisoresRepo.save(
      this.emisoresRepo.create({
        ...dto,
        ambientePorDefecto: dto.ambientePorDefecto ?? this.ambienteDefault(),
        activo: true,
      }),
    );
  }

  async obtenerEmisorActivo() {
    const emisor = await this.emisoresRepo.findOne({
      where: { activo: true },
      relations: ['establecimientos', 'establecimientos.puntosVenta'],
    });
    if (!emisor) throw new NotFoundException('No hay emisor activo configurado');
    return emisor;
  }

  async obtenerEmisor(id: number) {
    const emisor = await this.emisoresRepo.findOne({
      where: { id },
      relations: ['establecimientos', 'establecimientos.puntosVenta'],
    });
    if (!emisor) throw new NotFoundException('Emisor no encontrado');
    return emisor;
  }

  listarEmisores() {
    return this.emisoresRepo.find({
      relations: ['establecimientos', 'establecimientos.puntosVenta'],
      order: { id: 'ASC' },
    });
  }

  async actualizarEmisor(id: number, dto: UpdateEmisorDto) {
    const emisor = await this.obtenerEmisor(id);
    if (dto.nit && dto.nit !== emisor.nit) {
      const nitDuplicado = await this.emisoresRepo.findOneBy({ nit: dto.nit });
      if (nitDuplicado) throw new ConflictException('Ya existe un emisor con ese NIT');
    }
    Object.assign(emisor, dto);
    return this.emisoresRepo.save(emisor);
  }

  async desactivarEmisor(id: number) {
    const emisor = await this.obtenerEmisor(id);
    if (!emisor.activo) throw new ConflictException('El emisor ya está desactivado');
    emisor.activo = false;
    return this.emisoresRepo.save(emisor);
  }

  async crearEstablecimiento(dto: CreateEstablecimientoDto) {
    const emisor = await this.obtenerEmisorActivo();
    const existente = await this.establecimientosRepo.findOne({
      where: { codigo: dto.codigo, emisor: { id: emisor.id } },
    });
    if (existente) throw new ConflictException('Ya existe un establecimiento con ese código para el emisor');

    return this.establecimientosRepo.save(
      this.establecimientosRepo.create({ ...dto, emisor, activo: true }),
    );
  }

  async listarEstablecimientos() {
    const emisor = await this.obtenerEmisorActivo();
    return this.establecimientosRepo.find({
      where: { emisor: { id: emisor.id } },
      relations: ['puntosVenta'],
      order: { codigo: 'ASC' },
    });
  }

  async obtenerEstablecimiento(id: number) {
    const establecimiento = await this.establecimientosRepo.findOne({
      where: { id },
      relations: ['emisor', 'puntosVenta'],
    });
    if (!establecimiento) throw new NotFoundException('Establecimiento no encontrado');
    return establecimiento;
  }

  async actualizarEstablecimiento(id: number, dto: UpdateEstablecimientoDto) {
    const establecimiento = await this.obtenerEstablecimiento(id);
    if (dto.codigo && dto.codigo !== establecimiento.codigo) {
      const existente = await this.establecimientosRepo.findOne({
        where: { codigo: dto.codigo, emisor: { id: establecimiento.emisor.id } },
      });
      if (existente) throw new ConflictException('Ya existe un establecimiento con ese código');
    }
    Object.assign(establecimiento, dto);
    return this.establecimientosRepo.save(establecimiento);
  }

  async desactivarEstablecimiento(id: number) {
    const establecimiento = await this.obtenerEstablecimiento(id);
    if (!establecimiento.activo) throw new ConflictException('El establecimiento ya está desactivado');
    establecimiento.activo = false;
    return this.establecimientosRepo.save(establecimiento);
  }

  async crearPuntoVenta(establecimientoId: number, dto: CreatePuntoVentaDto) {
    const establecimiento = await this.obtenerEstablecimiento(establecimientoId);
    if (!establecimiento.activo) {
      throw new BadRequestException('No se pueden crear puntos de venta en un establecimiento desactivado');
    }
    const existente = await this.puntosRepo.findOne({
      where: { codigo: dto.codigo, establecimiento: { id: establecimiento.id } },
    });
    if (existente) throw new ConflictException('Ya existe un punto de venta con ese código en el establecimiento');

    return this.puntosRepo.save(
      this.puntosRepo.create({ ...dto, establecimiento, activo: true }),
    );
  }

  async listarPuntosVenta(establecimientoId: number) {
    await this.obtenerEstablecimiento(establecimientoId);
    return this.puntosRepo.find({
      where: { establecimiento: { id: establecimientoId } },
      order: { codigo: 'ASC' },
    });
  }

  async obtenerPuntoVenta(id: number) {
    const pv = await this.puntosRepo.findOne({
      where: { id },
      relations: ['establecimiento', 'establecimiento.emisor'],
    });
    if (!pv) throw new NotFoundException('Punto de venta no encontrado');
    return pv;
  }

  async actualizarPuntoVenta(id: number, dto: UpdatePuntoVentaDto) {
    const pv = await this.obtenerPuntoVenta(id);
    if (dto.codigo && dto.codigo !== pv.codigo) {
      const existente = await this.puntosRepo.findOne({
        where: { codigo: dto.codigo, establecimiento: { id: pv.establecimiento.id } },
      });
      if (existente) throw new ConflictException('Ya existe un punto de venta con ese código');
    }
    Object.assign(pv, dto);
    return this.puntosRepo.save(pv);
  }

  async desactivarPuntoVenta(id: number) {
    const pv = await this.obtenerPuntoVenta(id);
    if (!pv.activo) throw new ConflictException('El punto de venta ya está desactivado');
    pv.activo = false;
    return this.puntosRepo.save(pv);
  }
}
