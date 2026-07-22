import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSerieDto } from './dto/create-serie.dto';
import { SeriesService } from './series.service';

@ApiTags('Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear serie de numeración por tipo de documento (solo ADMIN)' })
  crear(@Body() dto: CreateSerieDto) {
    return this.seriesService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar series y su correlativo actual' })
  listar() {
    return this.seriesService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener serie por id' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.obtener(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar serie (no se podrá emitir con ella; solo ADMIN)' })
  desactivar(@Param('id', ParseIntPipe) id: number) {
    return this.seriesService.desactivar(id);
  }
}
