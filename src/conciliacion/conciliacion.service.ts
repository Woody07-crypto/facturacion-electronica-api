import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { round2 } from '../common/utils/decimal.util';
import { EstadoFactura, Factura } from '../facturas/factura.entity';
import { FacturasService } from '../facturas/facturas.service';

@Injectable()
export class ConciliacionService {
  constructor(
    @InjectRepository(Factura) private readonly facturasRepo: Repository<Factura>,
    private readonly facturasService: FacturasService,
  ) {}

  async resumen() {
    const facturas = await this.facturasRepo.find({
      where: { estado: Not(EstadoFactura.ANULADA) },
      relations: ['pagos', 'notasCredito', 'notasDebito'],
    });
    const ahora = new Date();

    const mapear = (f: Factura) => {
      const saldo = this.facturasService.calcularSaldo(f);
      return {
        id: f.id,
        numeroCompleto: f.numeroCompleto,
        cliente: f.cliente?.nombre,
        estado: f.estado,
        fechaEmision: f.fechaEmision,
        fechaVencimiento: f.fechaVencimiento,
        ...saldo,
      };
    };

    const todas = facturas.map(mapear);
    const pagadas = todas.filter((f) => f.saldoPendiente <= 0);
    const conSaldo = todas.filter((f) => f.saldoPendiente > 0);
    const vencidas = conSaldo.filter((f) => new Date(f.fechaVencimiento) < ahora);
    const pendientes = conSaldo.filter((f) => new Date(f.fechaVencimiento) >= ahora);

    return {
      resumen: {
        totalFacturas: todas.length,
        pendientesDeCobro: pendientes.length,
        vencidas: vencidas.length,
        pagadas: pagadas.length,
        montoPorCobrar: round2(conSaldo.reduce((acc, f) => acc + f.saldoPendiente, 0)),
      },
      pendientes,
      vencidas,
      pagadas,
    };
  }
}
