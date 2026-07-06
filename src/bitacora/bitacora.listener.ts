import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bitacora } from './bitacora.entity';

export interface EventoTransicion {
  entidad: string;
  entidadId: number;
  accion: string;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  detalle?: string;
  usuario?: string;
}

@Injectable()
export class BitacoraListener {
  constructor(@InjectRepository(Bitacora) private readonly bitacoraRepo: Repository<Bitacora>) {}

  @OnEvent('documento.transicion')
  async registrar(evento: EventoTransicion) {
    await this.bitacoraRepo.save(this.bitacoraRepo.create(evento));
  }
}
