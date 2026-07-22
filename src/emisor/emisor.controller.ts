import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateEmisorDto } from './dto/create-emisor.dto';
import { CreateEstablecimientoDto } from './dto/create-establecimiento.dto';
import { CreatePuntoVentaDto } from './dto/create-punto-venta.dto';
import { UpdateEmisorDto } from './dto/update-emisor.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';
import { UpdatePuntoVentaDto } from './dto/update-punto-venta.dto';
import { EmisorService } from './emisor.service';

@ApiTags('Emisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emisor')
export class EmisorController {
  constructor(private readonly emisorService: EmisorService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Registrar emisor (contribuyente). Solo un emisor activo en Fase 1.' })
  crearEmisor(@Body() dto: CreateEmisorDto) {
    return this.emisorService.crearEmisor(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar emisores (incluye inactivos)' })
  listarEmisores() {
    return this.emisorService.listarEmisores();
  }

  @Get('activo')
  @ApiOperation({ summary: 'Obtener emisor activo con establecimientos y puntos de venta' })
  obtenerActivo() {
    return this.emisorService.obtenerEmisorActivo();
  }

  @Post('establecimientos')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear establecimiento del emisor activo (solo ADMIN)' })
  crearEstablecimiento(@Body() dto: CreateEstablecimientoDto) {
    return this.emisorService.crearEstablecimiento(dto);
  }

  @Get('establecimientos')
  @ApiOperation({ summary: 'Listar establecimientos del emisor activo' })
  listarEstablecimientos() {
    return this.emisorService.listarEstablecimientos();
  }

  @Get('establecimientos/:id')
  @ApiOperation({ summary: 'Obtener establecimiento por id' })
  obtenerEstablecimiento(@Param('id', ParseIntPipe) id: number) {
    return this.emisorService.obtenerEstablecimiento(id);
  }

  @Patch('establecimientos/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar establecimiento (solo ADMIN)' })
  actualizarEstablecimiento(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEstablecimientoDto) {
    return this.emisorService.actualizarEstablecimiento(id, dto);
  }

  @Delete('establecimientos/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar establecimiento (solo ADMIN)' })
  desactivarEstablecimiento(@Param('id', ParseIntPipe) id: number) {
    return this.emisorService.desactivarEstablecimiento(id);
  }

  @Post('establecimientos/:id/puntos-venta')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear punto de venta en un establecimiento (solo ADMIN)' })
  crearPuntoVenta(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePuntoVentaDto) {
    return this.emisorService.crearPuntoVenta(id, dto);
  }

  @Get('establecimientos/:id/puntos-venta')
  @ApiOperation({ summary: 'Listar puntos de venta de un establecimiento' })
  listarPuntosVenta(@Param('id', ParseIntPipe) id: number) {
    return this.emisorService.listarPuntosVenta(id);
  }

  @Patch('puntos-venta/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar punto de venta (solo ADMIN)' })
  actualizarPuntoVenta(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePuntoVentaDto) {
    return this.emisorService.actualizarPuntoVenta(id, dto);
  }

  @Delete('puntos-venta/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar punto de venta (solo ADMIN)' })
  desactivarPuntoVenta(@Param('id', ParseIntPipe) id: number) {
    return this.emisorService.desactivarPuntoVenta(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener emisor por id' })
  obtenerEmisor(@Param('id', ParseIntPipe) id: number) {
    return this.emisorService.obtenerEmisor(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar datos del emisor (solo ADMIN)' })
  actualizarEmisor(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmisorDto) {
    return this.emisorService.actualizarEmisor(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar emisor (solo ADMIN)' })
  desactivarEmisor(@Param('id', ParseIntPipe) id: number) {
    return this.emisorService.desactivarEmisor(id);
  }
}
