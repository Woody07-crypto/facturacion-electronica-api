import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSerieDto } from './dto/create-serie.dto';
import { Serie } from './serie.entity';

@Injectable()
export class SeriesService {
  constructor(@InjectRepository(Serie) private readonly seriesRepo: Repository<Serie>) {}

  async crear(dto: CreateSerieDto) {
    const existente = await this.seriesRepo.findOneBy({ tipoDocumento: dto.tipoDocumento, prefijo: dto.prefijo });
    if (existente) throw new ConflictException('Ya existe una serie con ese tipo y prefijo');
    return this.seriesRepo.save(this.seriesRepo.create(dto));
  }

  listar() {
    return this.seriesRepo.find();
  }

  async obtener(id: number) {
    const serie = await this.seriesRepo.findOneBy({ id });
    if (!serie) throw new NotFoundException('Serie no encontrada');
    return serie;
  }

  async desactivar(id: number) {
    const serie = await this.obtener(id);
    if (!serie.activa) throw new ConflictException('La serie ya está desactivada');
    serie.activa = false;
    return this.seriesRepo.save(serie);
  }
}
