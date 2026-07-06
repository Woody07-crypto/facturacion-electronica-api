import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePagoDto } from './dto/create-pago.dto';
import { PagosService } from './pagos.service';

@ApiTags('Pagos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('facturas/:facturaId/pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar pago parcial o total asociado a una factura' })
  registrar(
    @Param('facturaId', ParseIntPipe) facturaId: number,
    @Body() dto: CreatePagoDto,
    @UsuarioActual() usuario: any,
  ) {
    return this.pagosService.registrar(facturaId, dto, usuario);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pagos de una factura' })
  listar(@Param('facturaId', ParseIntPipe) facturaId: number) {
    return this.pagosService.listar(facturaId);
  }
}
