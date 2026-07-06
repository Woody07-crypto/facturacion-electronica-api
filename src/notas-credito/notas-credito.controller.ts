import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateNotaCreditoDto } from './dto/create-nota-credito.dto';
import { NotasCreditoService } from './notas-credito.service';

@ApiTags('Notas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notas-credito')
export class NotasCreditoController {
  constructor(private readonly notasService: NotasCreditoService) {}

  @Post()
  @ApiOperation({ summary: 'Emitir nota de crédito vinculada a una factura original' })
  emitir(@Body() dto: CreateNotaCreditoDto, @UsuarioActual() usuario: any) {
    return this.notasService.emitir(dto, usuario);
  }

  @Get()
  @ApiOperation({ summary: 'Listar notas de crédito' })
  listar() {
    return this.notasService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener nota de crédito por id' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.notasService.obtener(id);
  }
}
