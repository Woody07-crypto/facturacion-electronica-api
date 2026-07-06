import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConciliacionService } from './conciliacion.service';

@ApiTags('Conciliación')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conciliacion')
export class ConciliacionController {
  constructor(private readonly conciliacionService: ConciliacionService) {}

  @Get()
  @ApiOperation({ summary: 'Facturas pendientes de cobro, vencidas y pagadas con saldos' })
  resumen() {
    return this.conciliacionService.resumen();
  }
}
