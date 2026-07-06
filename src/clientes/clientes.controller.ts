import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cliente/receptor con datos fiscales' })
  crear(@Body() dto: CreateClienteDto) {
    return this.clientesService.crear(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes activos' })
  listar() {
    return this.clientesService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por id' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.obtener(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClienteDto) {
    return this.clientesService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar cliente (solo ADMIN)' })
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.eliminar(id);
  }
}
