import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Not, Repository } from 'typeorm';
import { round2 } from '../common/utils/decimal.util';
import { EstadoFactura, Factura } from '../facturas/factura.entity';

@Injectable()
export class ReportesService {
  constructor(@InjectRepository(Factura) private readonly facturasRepo: Repository<Factura>) {}

  async ventas(periodo: string) {
    const ahora = new Date();
    const desde = new Date(ahora);
    if (periodo === 'dia') {
      desde.setHours(0, 0, 0, 0);
    } else if (periodo === 'semana') {
      desde.setDate(desde.getDate() - 6);
      desde.setHours(0, 0, 0, 0);
    } else if (periodo === 'mes') {
      desde.setDate(1);
      desde.setHours(0, 0, 0, 0);
    } else {
      throw new BadRequestException("El período debe ser 'dia', 'semana' o 'mes'");
    }

    const facturas = await this.facturasRepo.find({
      where: { estado: Not(EstadoFactura.ANULADA), fechaEmision: MoreThanOrEqual(desde) },
    });

    const porCliente = new Map<number, { clienteId: number; cliente: string; cantidadFacturas: number; subtotal: number; iva: number; total: number }>();
    for (const f of facturas) {
      const clave = f.cliente.id;
      const acumulado = porCliente.get(clave) || {
        clienteId: f.cliente.id,
        cliente: f.cliente.nombre,
        cantidadFacturas: 0,
        subtotal: 0,
        iva: 0,
        total: 0,
      };
      acumulado.cantidadFacturas += 1;
      acumulado.subtotal = round2(acumulado.subtotal + f.subtotal);
      acumulado.iva = round2(acumulado.iva + f.iva);
      acumulado.total = round2(acumulado.total + f.total);
      porCliente.set(clave, acumulado);
    }

    return {
      periodo,
      desde,
      hasta: ahora,
      totalFacturas: facturas.length,
      granTotal: round2(facturas.reduce((acc, f) => acc + f.total, 0)),
      porCliente: Array.from(porCliente.values()).sort((a, b) => b.total - a.total),
    };
  }
}
