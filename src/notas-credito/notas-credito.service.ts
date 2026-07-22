import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { esViolacionUnicidad, round2 } from '../common/utils/decimal.util';
import { mutexSeries } from '../common/utils/mutex.util';
import { EstadoFactura } from '../facturas/factura.entity';
import { FacturasService } from '../facturas/facturas.service';
import { Serie } from '../series/serie.entity';
import { CreateNotaCreditoDto } from './dto/create-nota-credito.dto';
import { NotaCredito } from './nota-credito.entity';

@Injectable()
export class NotasCreditoService {
  constructor(
    @InjectRepository(NotaCredito) private readonly notasRepo: Repository<NotaCredito>,
    private readonly facturasService: FacturasService,
    private readonly dataSource: DataSource,
    private readonly eventos: EventEmitter2,
  ) {}

  async emitir(dto: CreateNotaCreditoDto, usuario?: { email?: string }) {
    const factura = await this.facturasService.obtener(dto.facturaId);
    if (factura.estado === EstadoFactura.ANULADA) {
      throw new ConflictException('No se pueden emitir notas de crédito sobre una factura anulada');
    }
    const acreditado = round2((factura.notasCredito || []).reduce((acc, n) => acc + n.monto, 0));
    if (round2(acreditado + dto.monto) > factura.total) {
      throw new ConflictException(
        `La nota de crédito no puede superar el monto original de la factura ($${factura.total}); ya acreditado: $${acreditado}`,
      );
    }

    let notaGuardada: NotaCredito;
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
          if (serie.tipoDocumento !== 'NOTA_CREDITO') {
            throw new BadRequestException('La serie indicada no corresponde a notas de crédito');
          }
          const numero = serie.correlativoActual + 1;
          const nota = manager.create(NotaCredito, {
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
      entidad: 'NOTA_CREDITO',
      entidadId: notaGuardada.id,
      accion: 'EMISION',
      estadoAnterior: null,
      estadoNuevo: 'EMITIDA',
      detalle: `NC ${notaGuardada.numeroCompleto} por $${dto.monto} vinculada a factura ${factura.numeroCompleto}`,
      usuario: usuario?.email,
    });

    factura.notasCredito = [...(factura.notasCredito || []), notaGuardada];
    await this.facturasService.actualizarEstadoPorSaldo(factura, usuario, 'NOTA_CREDITO');

    return notaGuardada;
  }

  listar() {
    return this.notasRepo.find({ relations: ['factura'], order: { fechaEmision: 'DESC' } });
  }

  async obtener(id: number) {
    const nota = await this.notasRepo.findOne({ where: { id }, relations: ['factura'] });
    if (!nota) throw new NotFoundException('Nota de crédito no encontrada');
    return nota;
  }
}
