import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { round2 } from '../common/utils/decimal.util';
import { EstadoFactura } from '../facturas/factura.entity';
import { FacturasService } from '../facturas/facturas.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { Pago } from './pago.entity';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago) private readonly pagosRepo: Repository<Pago>,
    private readonly facturasService: FacturasService,
    private readonly eventos: EventEmitter2,
  ) {}

  async registrar(facturaId: number, dto: CreatePagoDto, usuario?: { email?: string }) {
    const factura = await this.facturasService.obtener(facturaId);
    if (factura.estado === EstadoFactura.ANULADA) {
      throw new ConflictException('No se pueden registrar pagos en una factura anulada');
    }
    const { saldoPendiente } = this.facturasService.calcularSaldo(factura);
    if (dto.monto > saldoPendiente) {
      throw new BadRequestException(`El monto ($${dto.monto}) excede el saldo pendiente ($${saldoPendiente})`);
    }

    const pago = await this.pagosRepo.save(
      this.pagosRepo.create({ factura, monto: dto.monto, metodo: dto.metodo, referencia: dto.referencia, registradoPor: usuario?.email }),
    );

    await this.eventos.emitAsync('documento.transicion', {
      entidad: 'PAGO',
      entidadId: pago.id,
      accion: 'REGISTRO_PAGO',
      estadoAnterior: null,
      estadoNuevo: 'REGISTRADO',
      detalle: `Pago de $${dto.monto} (${dto.metodo}) a factura ${factura.numeroCompleto}`,
      usuario: usuario?.email,
    });

    factura.pagos = [...(factura.pagos || []), pago];
    await this.facturasService.actualizarEstadoPorSaldo(factura, usuario, 'PAGO');

    const nuevoSaldo = round2(saldoPendiente - dto.monto);
    return {
      pago: { id: pago.id, monto: pago.monto, metodo: pago.metodo, referencia: pago.referencia, fecha: pago.fecha },
      facturaId: factura.id,
      estado: factura.estado,
      saldoPendiente: nuevoSaldo,
    };
  }

  async listar(facturaId: number) {
    const factura = await this.facturasService.obtener(facturaId);
    return factura.pagos || [];
  }
}
