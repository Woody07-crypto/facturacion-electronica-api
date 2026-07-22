import { ConflictException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ClientesService } from '../clientes/clientes.service';
import { FacturasService } from '../facturas/facturas.service';
import { PagosService } from '../pagos/pagos.service';
import { SeriesService } from '../series/series.service';
import { NotasDebitoService } from './notas-debito.service';

describe('NotasDebitoService (reglas de negocio)', () => {
  let app: INestApplication;
  let notasService: NotasDebitoService;
  let facturasService: FacturasService;
  let seriesService: SeriesService;
  let pagosService: PagosService;
  let facturaId: number;
  let serieNdId: number;
  const usuario = { email: 'admin@esen.com.sv' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    notasService = app.get(NotasDebitoService);
    facturasService = app.get(FacturasService);
    seriesService = app.get(SeriesService);
    pagosService = app.get(PagosService);
    const clientesService = app.get(ClientesService);

    const cliente = await clientesService.crear({
      nombre: 'Importadora del Pacífico',
      nit: '0614-555666-777-8',
      nrc: '22222-2',
      giro: 'Importación',
    });
    const serieFac = await seriesService.crear({ tipoDocumento: 'FACTURA', prefijo: 'FD-TEST' });
    const serieNd = await seriesService.crear({ tipoDocumento: 'NOTA_DEBITO', prefijo: 'ND-TEST' });
    serieNdId = serieNd.id;

    const factura = await facturasService.emitir(
      {
        clienteId: cliente.id,
        serieId: serieFac.id,
        lineas: [{ descripcion: 'Motor industrial', cantidad: 1, precioUnitario: 100 }],
      },
      usuario,
    );
    facturaId = factura.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('emite una nota de débito con correlativo y aumenta el saldo pendiente', async () => {
    const saldoAntes = await facturasService.obtenerSaldo(facturaId);
    const nota = await notasService.emitir(
      { facturaId, serieId: serieNdId, monto: 11.3, razon: 'Flete adicional no facturado' },
      usuario,
    );
    expect(nota.numeroCompleto).toBe('ND-TEST-000001');

    const saldo = await facturasService.obtenerSaldo(facturaId);
    expect(saldo.notasDebito).toBe(11.3);
    expect(saldo.saldoPendiente).toBe(saldoAntes.saldoPendiente + 11.3);
  });

  it('rechaza notas de débito sobre facturas anuladas', async () => {
    const serieFac = await seriesService.crear({ tipoDocumento: 'FACTURA', prefijo: 'FD2-TEST' });
    const clientesService = app.get(ClientesService);
    const cliente = await clientesService.crear({
      nombre: 'Cliente Anulable ND',
      nit: '0614-444333-222-1',
      nrc: '33333-3',
      giro: 'Comercio',
    });
    const factura = await facturasService.emitir(
      {
        clienteId: cliente.id,
        serieId: serieFac.id,
        lineas: [{ descripcion: 'Item', cantidad: 1, precioUnitario: 10 }],
      },
      usuario,
    );
    await facturasService.anular(factura.id, 'Anulada para prueba ND', usuario);

    await expect(
      notasService.emitir(
        { facturaId: factura.id, serieId: serieNdId, monto: 5, razon: 'Intento inválido' },
        usuario,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('reabre el saldo de una factura PAGADA al emitir una nota de débito', async () => {
    const serieFac = await seriesService.crear({ tipoDocumento: 'FACTURA', prefijo: 'FD3-TEST' });
    const clientesService = app.get(ClientesService);
    const cliente = await clientesService.crear({
      nombre: 'Cliente Reapertura',
      nit: '0614-777888-999-0',
      nrc: '44444-4',
      giro: 'Servicios',
    });
    const factura = await facturasService.emitir(
      {
        clienteId: cliente.id,
        serieId: serieFac.id,
        lineas: [{ descripcion: 'Servicio', cantidad: 1, precioUnitario: 100 }],
      },
      usuario,
    );
    await pagosService.registrar(factura.id, { monto: factura.total, metodo: 'EFECTIVO' }, usuario);
    let saldo = await facturasService.obtenerSaldo(factura.id);
    expect(saldo.estado).toBe('PAGADA');
    expect(saldo.saldoPendiente).toBe(0);

    await notasService.emitir(
      { facturaId: factura.id, serieId: serieNdId, monto: 5.65, razon: 'Ajuste por interés moratorio' },
      usuario,
    );
    saldo = await facturasService.obtenerSaldo(factura.id);
    expect(saldo.saldoPendiente).toBe(5.65);
    expect(saldo.estado).toBe('PAGADA_PARCIAL');
  });
});
