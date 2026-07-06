import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ClientesService } from '../clientes/clientes.service';
import { PagosService } from '../pagos/pagos.service';
import { SeriesService } from '../series/series.service';
import { EstadoFactura } from './factura.entity';
import { FacturasService } from './facturas.service';

describe('FacturasService (reglas de negocio)', () => {
  let app: INestApplication;
  let facturasService: FacturasService;
  let pagosService: PagosService;
  let clienteId: number;
  let serieFacturaId: number;
  const usuario = { email: 'admin@ici.com.sv' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    facturasService = app.get(FacturasService);
    pagosService = app.get(PagosService);

    const clientesService = app.get(ClientesService);
    const seriesService = app.get(SeriesService);
    const cliente = await clientesService.crear({
      nombre: 'Ferretería El Progreso',
      nit: '0614-999888-101-1',
      nrc: '55555-5',
      giro: 'Ferretería',
    });
    clienteId = cliente.id;
    const serie = await seriesService.crear({ tipoDocumento: 'FACTURA', prefijo: 'FA-TEST' });
    serieFacturaId = serie.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('calcula IVA (13%) y totales por línea y por factura', async () => {
    const factura = await facturasService.emitir(
      {
        clienteId,
        serieId: serieFacturaId,
        lineas: [{ descripcion: 'Cemento bolsa', cantidad: 4, precioUnitario: 8.25 }],
      },
      usuario,
    );
    expect(factura.subtotal).toBe(33);
    expect(factura.iva).toBe(4.29);
    expect(factura.total).toBe(37.29);
    expect(factura.lineas[0].iva).toBe(4.29);
    expect(factura.numero).toBe(1);
  });

  it('incrementa el correlativo en cada emisión', async () => {
    const factura = await facturasService.emitir(
      { clienteId, serieId: serieFacturaId, lineas: [{ descripcion: 'Clavos lb', cantidad: 1, precioUnitario: 1 }] },
      usuario,
    );
    expect(factura.numero).toBe(2);
    expect(factura.numeroCompleto).toBe('FA-TEST-000002');
  });

  it('lanza NotFound si el cliente no existe', async () => {
    await expect(
      facturasService.emitir(
        { clienteId: 9999, serieId: serieFacturaId, lineas: [{ descripcion: 'X', cantidad: 1, precioUnitario: 1 }] },
        usuario,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequest si la serie no es de tipo FACTURA', async () => {
    const seriesService = app.get(SeriesService);
    const serieNc = await seriesService.crear({ tipoDocumento: 'NOTA_CREDITO', prefijo: 'NC-TEST' });
    await expect(
      facturasService.emitir(
        { clienteId, serieId: serieNc.id, lineas: [{ descripcion: 'X', cantidad: 1, precioUnitario: 1 }] },
        usuario,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('impide anular una factura con pagos registrados', async () => {
    const factura = await facturasService.emitir(
      { clienteId, serieId: serieFacturaId, lineas: [{ descripcion: 'Martillo', cantidad: 1, precioUnitario: 10 }] },
      usuario,
    );
    await pagosService.registrar(factura.id, { monto: 5, metodo: 'EFECTIVO' }, usuario);
    await expect(facturasService.anular(factura.id, 'Intento inválido', usuario)).rejects.toThrow(ConflictException);
  });

  it('anula una factura sin pagos y no permite anularla dos veces', async () => {
    const factura = await facturasService.emitir(
      { clienteId, serieId: serieFacturaId, lineas: [{ descripcion: 'Brocha', cantidad: 1, precioUnitario: 3 }] },
      usuario,
    );
    const anulada = await facturasService.anular(factura.id, 'Emitida por error', usuario);
    expect(anulada.estado).toBe(EstadoFactura.ANULADA);
    expect(anulada.razonAnulacion).toBe('Emitida por error');
    await expect(facturasService.anular(factura.id, 'De nuevo', usuario)).rejects.toThrow(ConflictException);
  });

  it('rechaza pagos sobre facturas anuladas y pagos mayores al saldo', async () => {
    const factura = await facturasService.emitir(
      { clienteId, serieId: serieFacturaId, lineas: [{ descripcion: 'Lija', cantidad: 2, precioUnitario: 0.5 }] },
      usuario,
    );
    await expect(pagosService.registrar(factura.id, { monto: 100, metodo: 'EFECTIVO' }, usuario)).rejects.toThrow(
      BadRequestException,
    );
    await facturasService.anular(factura.id, 'Anulada para prueba', usuario);
    await expect(pagosService.registrar(factura.id, { monto: 1, metodo: 'EFECTIVO' }, usuario)).rejects.toThrow(
      ConflictException,
    );
  });

  it('transiciona a PAGADA al completar el total con pagos parciales', async () => {
    const factura = await facturasService.emitir(
      { clienteId, serieId: serieFacturaId, lineas: [{ descripcion: 'Cinta métrica', cantidad: 1, precioUnitario: 100 }] },
      usuario,
    );
    const parcial = await pagosService.registrar(factura.id, { monto: 60, metodo: 'TARJETA' }, usuario);
    expect(parcial.estado).toBe(EstadoFactura.PAGADA_PARCIAL);
    const final = await pagosService.registrar(factura.id, { monto: 53, metodo: 'EFECTIVO' }, usuario);
    expect(final.estado).toBe(EstadoFactura.PAGADA);
    expect(final.saldoPendiente).toBe(0);
  });
});
