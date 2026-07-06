import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas')
  @ApiOperation({ summary: 'Reporte de ventas por período (dia, semana, mes) con totales por cliente' })
  @ApiQuery({ name: 'periodo', enum: ['dia', 'semana', 'mes'] })
  ventas(@Query('periodo') periodo: string) {
    return this.reportesService.ventas(periodo || 'dia');
  }
}
