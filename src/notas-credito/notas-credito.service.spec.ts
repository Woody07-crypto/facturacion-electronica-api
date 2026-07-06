import { ConflictException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ClientesService } from '../clientes/clientes.service';
import { FacturasService } from '../facturas/facturas.service';
import { SeriesService } from '../series/series.service';
import { NotasCreditoService } from './notas-credito.service';

describe('NotasCreditoService (reglas de negocio)', () => {
  let app: INestApplication;
  let notasService: NotasCreditoService;
  let facturasService: FacturasService;
  let facturaId: number;
  let facturaTotal: number;
  let serieNcId: number;
  const usuario = { email: 'admin@ici.com.sv' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    notasService = app.get(NotasCreditoService);
    facturasService = app.get(FacturasService);
    const clientesService = app.get(ClientesService);
    const seriesService = app.get(SeriesService);

    const cliente = await clientesService.crear({
      nombre: 'Distribuidora Central',
      nit: '0614-111222-333-4',
      nrc: '11111-1',
      giro: 'Distribución',
    });
    const serieFac = await seriesService.crear({ tipoDocumento: 'FACTURA', prefijo: 'FB-TEST' });
    const serieNc = await seriesService.crear({ tipoDocumento: 'NOTA_CREDITO', prefijo: 'NB-TEST' });
    serieNcId = serieNc.id;

    const factura = await facturasService.emitir(
      {
        clienteId: cliente.id,
        serieId: serieFac.id,
        lineas: [{ descripcion: 'Compresor DURETAN', cantidad: 1, precioUnitario: 200 }],
      },
      usuario,
    );
    facturaId = factura.id;
    facturaTotal = factura.total;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza una nota de crédito que supere el monto original de la factura', async () => {
    await expect(
      notasService.emitir({ facturaId, serieId: serieNcId, monto: facturaTotal + 0.01, razon: 'Excede total' }, usuario),
    ).rejects.toThrow(ConflictException);
  });

  it('emite una nota de crédito válida con correlativo y reduce el saldo', async () => {
    const nota = await notasService.emitir(
      { facturaId, serieId: serieNcId, monto: 26, razon: 'Producto dañado' },
      usuario,
    );
    expect(nota.numeroCompleto).toBe('NB-TEST-000001');

    const saldo = await facturasService.obtenerSaldo(facturaId);
    expect(saldo.notasCredito).toBe(26);
    expect(saldo.saldoPendiente).toBe(200);
  });

  it('rechaza la suma acumulada de notas de crédito por encima del total', async () => {
    await expect(
      notasService.emitir({ facturaId, serieId: serieNcId, monto: facturaTotal - 25, razon: 'Suma acumulada excede' }, usuario),
    ).rejects.toThrow(ConflictException);
  });

  it('marca la factura como PAGADA si las notas cubren el total', async () => {
    const restante = facturaTotal - 26;
    await notasService.emitir({ facturaId, serieId: serieNcId, monto: restante, razon: 'Anulación comercial total' }, usuario);
    const saldo = await facturasService.obtenerSaldo(facturaId);
    expect(saldo.saldoPendiente).toBe(0);
    expect(saldo.estado).toBe('PAGADA');
  });
});
