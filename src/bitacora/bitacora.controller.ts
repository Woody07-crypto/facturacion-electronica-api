import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Bitacora } from './bitacora.entity';

@ApiTags('Bitácora')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bitacora')
export class BitacoraController {
  constructor(@InjectRepository(Bitacora) private readonly bitacoraRepo: Repository<Bitacora>) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Auditoría de transiciones de estado (solo ADMIN)' })
  @ApiQuery({ name: 'entidad', required: false })
  listar(@Query('entidad') entidad?: string) {
    return this.bitacoraRepo.find({ where: entidad ? { entidad } : {}, order: { fecha: 'DESC' } });
  }
}
