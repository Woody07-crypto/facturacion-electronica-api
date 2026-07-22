import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { esViolacionUnicidad } from '../common/utils/decimal.util';
import { mutexSeries } from '../common/utils/mutex.util';
import { EstadoFactura } from '../facturas/factura.entity';
import { FacturasService } from '../facturas/facturas.service';
import { Serie } from '../series/serie.entity';
import { CreateNotaDebitoDto } from './dto/create-nota-debito.dto';
import { NotaDebito } from './nota-debito.entity';

@Injectable()
export class NotasDebitoService {
  constructor(
    @InjectRepository(NotaDebito) private readonly notasRepo: Repository<NotaDebito>,
    private readonly facturasService: FacturasService,
    private readonly dataSource: DataSource,
    private readonly eventos: EventEmitter2,
  ) {}

  async emitir(dto: CreateNotaDebitoDto, usuario?: { email?: string }) {
    const factura = await this.facturasService.obtener(dto.facturaId);
    if (factura.estado === EstadoFactura.ANULADA) {
      throw new ConflictException('No se pueden emitir notas de débito sobre una factura anulada');
    }

    let notaGuardada: NotaDebito;
    let ultimoError: any;
    await mutexSeries.ejecutar(`serie-${dto.serieId}`, async () => {
      for (let intento = 0; intento < 3; intento++) {
        try {
          notaGuardada = await this.dataSource.transaction(async (manager) => {
            const opcionesBusqueda: any = { where: { id: dto.serieId } };
            if (this.dataSource.options.type === 'postgres') {
              opcionesBusqueda.lock = { mode: 'pessimistic_write' };
            }
            const serie = await manager.findOne(Serie, opcionesBusqueda);
            if (!serie) throw new NotFoundException('Serie no encontrada');
            if (!serie.activa) throw new BadRequestException('La serie está desactivada');
            if (serie.tipoDocumento !== 'NOTA_DEBITO') {
              throw new BadRequestException('La serie indicada no corresponde a notas de débito');
            }
            const numero = serie.correlativoActual + 1;
            const nota = manager.create(NotaDebito, {
              serie,
              numero,
              numeroCompleto: `${serie.prefijo}-${String(numero).padStart(6, '0')}`,
              factura,
              monto: dto.monto,
              razon: dto.razon,
              emitidaPor: usuario?.email,
            });
            const guardada = await manager.save(nota);
            serie.correlativoActual = numero;
            await manager.save(serie);
            return guardada;
          });
          break;
        } catch (error) {
          ultimoError = error;
          if (intento < 2 && esViolacionUnicidad(error)) continue;
          throw error;
        }
      }
    });
    if (!notaGuardada) throw ultimoError;

    await this.eventos.emitAsync('documento.transicion', {
      entidad: 'NOTA_DEBITO',
      entidadId: notaGuardada.id,
      accion: 'EMISION',
      estadoAnterior: null,
      estadoNuevo: 'EMITIDA',
      detalle: `ND ${notaGuardada.numeroCompleto} por $${dto.monto} vinculada a factura ${factura.numeroCompleto}`,
      usuario: usuario?.email,
    });

    factura.notasDebito = [...(factura.notasDebito || []), notaGuardada];
    await this.facturasService.actualizarEstadoPorSaldo(factura, usuario, 'NOTA_DEBITO');

    return notaGuardada;
  }

  listar() {
    return this.notasRepo.find({ relations: ['factura'], order: { fechaEmision: 'DESC' } });
  }

  async obtener(id: number) {
    const nota = await this.notasRepo.findOne({ where: { id }, relations: ['factura'] });
    if (!nota) throw new NotFoundException('Nota de débito no encontrada');
    return nota;
  }
}
