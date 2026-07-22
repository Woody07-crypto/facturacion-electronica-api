import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { esViolacionUnicidad, IVA_RATE, round2 } from '../common/utils/decimal.util';
import { mutexSeries } from '../common/utils/mutex.util';
import { Serie } from '../series/serie.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { EstadoFactura, Factura } from './factura.entity';
import { LineaFactura } from './linea-factura.entity';

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura) private readonly facturasRepo: Repository<Factura>,
    @InjectRepository(Cliente) private readonly clientesRepo: Repository<Cliente>,
    private readonly dataSource: DataSource,
    private readonly eventos: EventEmitter2,
  ) {}

  async emitir(dto: CreateFacturaDto, usuario?: { email?: string }) {
    const cliente = await this.clientesRepo.findOneBy({ id: dto.clienteId, activo: true });
    if (!cliente) throw new NotFoundException('Cliente no encontrado o inactivo');

    let facturaGuardada: Factura;
    let ultimoError: any;

    await mutexSeries.ejecutar(`serie-${dto.serieId}`, async () => {
    for (let intento = 0; intento < 3; intento++) {
      try {
        facturaGuardada = await this.dataSource.transaction(async (manager) => {
          const opcionesBusqueda: any = { where: { id: dto.serieId } };
          if (this.dataSource.options.type === 'postgres') {
            opcionesBusqueda.lock = { mode: 'pessimistic_write' };
          }
          const serie = await manager.findOne(Serie, opcionesBusqueda);
          if (!serie) throw new NotFoundException('Serie no encontrada');
          if (!serie.activa) throw new BadRequestException('La serie está desactivada');
          if (serie.tipoDocumento !== 'FACTURA') {
            throw new BadRequestException('La serie indicada no corresponde a facturas');
          }

          const numero = serie.correlativoActual + 1;
          const lineas = dto.lineas.map((l) => {
            const subtotal = round2(l.cantidad * l.precioUnitario);
            const iva = round2(subtotal * IVA_RATE);
            return manager.create(LineaFactura, {
              descripcion: l.descripcion,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
              subtotal,
              iva,
              total: round2(subtotal + iva),
            });
          });

          const subtotal = round2(lineas.reduce((acc, l) => acc + l.subtotal, 0));
          const iva = round2(lineas.reduce((acc, l) => acc + l.iva, 0));
          const total = round2(subtotal + iva);

          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + (dto.diasCredito ?? 0));

          const factura = manager.create(Factura, {
            serie,
            numero,
            numeroCompleto: `${serie.prefijo}-${String(numero).padStart(6, '0')}`,
            cliente,
            estado: EstadoFactura.EMITIDA,
            subtotal,
            iva,
            total,
            fechaVencimiento,
            lineas,
          });
          const guardada = await manager.save(factura);

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
    if (!facturaGuardada) throw ultimoError;

    await this.eventos.emitAsync('documento.transicion', {
      entidad: 'FACTURA',
      entidadId: facturaGuardada.id,
      accion: 'EMISION',
      estadoAnterior: null,
      estadoNuevo: EstadoFactura.EMITIDA,
      detalle: `Factura ${facturaGuardada.numeroCompleto} por $${facturaGuardada.total}`,
      usuario: usuario?.email,
    });
    return facturaGuardada;
  }

  listar() {
    return this.facturasRepo.find({ order: { fechaEmision: 'DESC' } });
  }

  async obtener(id: number) {
    const factura = await this.facturasRepo.findOne({
      where: { id },
      relations: ['pagos', 'notasCredito', 'notasDebito'],
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');
    return factura;
  }

  calcularSaldo(factura: Factura) {
    const pagado = round2((factura.pagos || []).reduce((acc, p) => acc + p.monto, 0));
    const acreditado = round2((factura.notasCredito || []).reduce((acc, n) => acc + n.monto, 0));
    const debitado = round2((factura.notasDebito || []).reduce((acc, n) => acc + n.monto, 0));
    const saldoPendiente = round2(factura.total + debitado - pagado - acreditado);
    return {
      total: factura.total,
      pagado,
      notasCredito: acreditado,
      notasDebito: debitado,
      saldoPendiente,
    };
  }

  async obtenerSaldo(id: number) {
    const factura = await this.obtener(id);
    return { facturaId: factura.id, numeroCompleto: factura.numeroCompleto, estado: factura.estado, ...this.calcularSaldo(factura) };
  }

  async anular(id: number, razon: string, usuario?: { email?: string }) {
    const factura = await this.obtener(id);
    if (factura.estado === EstadoFactura.ANULADA) {
      throw new ConflictException('La factura ya está anulada');
    }
    if ((factura.pagos || []).length > 0) {
      throw new ConflictException('No se puede anular una factura que ya tiene pagos registrados');
    }
    const estadoAnterior = factura.estado;
    factura.estado = EstadoFactura.ANULADA;
    factura.razonAnulacion = razon;
    const guardada = await this.facturasRepo.save(factura);

    await this.eventos.emitAsync('documento.transicion', {
      entidad: 'FACTURA',
      entidadId: factura.id,
      accion: 'ANULACION',
      estadoAnterior,
      estadoNuevo: EstadoFactura.ANULADA,
      detalle: `Razón: ${razon}`,
      usuario: usuario?.email,
    });
    return guardada;
  }

  async actualizarEstadoPorSaldo(factura: Factura, usuario?: { email?: string }, accion = 'ACTUALIZACION_ESTADO') {
    const { saldoPendiente, pagado } = this.calcularSaldo(factura);
    let nuevoEstado = factura.estado;
    if (saldoPendiente <= 0) nuevoEstado = EstadoFactura.PAGADA;
    else if (pagado > 0) nuevoEstado = EstadoFactura.PAGADA_PARCIAL;
    else nuevoEstado = EstadoFactura.EMITIDA;

    if (nuevoEstado !== factura.estado) {
      const estadoAnterior = factura.estado;
      factura.estado = nuevoEstado;
      await this.facturasRepo.save(factura);
      await this.eventos.emitAsync('documento.transicion', {
        entidad: 'FACTURA',
        entidadId: factura.id,
        accion,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        detalle: `Saldo pendiente: $${saldoPendiente}`,
        usuario: usuario?.email,
      });
    }
    return factura;
  }
}
