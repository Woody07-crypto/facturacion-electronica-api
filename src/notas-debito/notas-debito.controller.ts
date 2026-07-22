import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateNotaDebitoDto } from './dto/create-nota-debito.dto';
import { NotasDebitoService } from './notas-debito.service';

@ApiTags('Notas de Débito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notas-debito')
export class NotasDebitoController {
  constructor(private readonly notasService: NotasDebitoService) {}

  @Post()
  @ApiOperation({ summary: 'Emitir nota de débito vinculada a una factura original (aumenta el saldo)' })
  emitir(@Body() dto: CreateNotaDebitoDto, @UsuarioActual() usuario: any) {
    return this.notasService.emitir(dto, usuario);
  }

  @Get()
  @ApiOperation({ summary: 'Listar notas de débito' })
  listar() {
    return this.notasService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener nota de débito por id' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.notasService.obtener(id);
  }
}
