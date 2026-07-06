import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnularFacturaDto } from './dto/anular-factura.dto';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { FacturasService } from './facturas.service';

@ApiTags('Facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post()
  @ApiOperation({ summary: 'Emitir factura con líneas de detalle, IVA automático (13%) y correlativo por serie' })
  emitir(@Body() dto: CreateFacturaDto, @UsuarioActual() usuario: any) {
    return this.facturasService.emitir(dto, usuario);
  }

  @Get()
  @ApiOperation({ summary: 'Listar facturas' })
  listar() {
    return this.facturasService.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener factura con pagos y notas de crédito' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.facturasService.obtener(id);
  }

  @Get(':id/saldo')
  @ApiOperation({ summary: 'Saldo pendiente descontando pagos parciales y notas de crédito' })
  saldo(@Param('id', ParseIntPipe) id: number) {
    return this.facturasService.obtenerSaldo(id);
  }

  @Post(':id/anular')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Anular factura con razón obligatoria (bloqueada si tiene pagos, solo ADMIN)' })
  anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularFacturaDto, @UsuarioActual() usuario: any) {
    return this.facturasService.anular(id, dto.razon, usuario);
  }
}
