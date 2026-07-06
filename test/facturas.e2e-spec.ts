import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './helpers';

describe('Flujo completo de facturación (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let clienteId: number;
  let serieFacturaId: number;
  let serieNotaId: number;
  let facturaId: number;
  let facturaAnulableId: number;

  beforeAll(async () => {
    app = await crearApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza acceso sin token', async () => {
    await request(app.getHttpServer()).get('/clientes').expect(401);
  });

  it('registra el primer usuario como ADMIN', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'admin@ici.com.sv', password: 'Secreto123', nombre: 'Admin ICI' })
      .expect(201);
    expect(res.body.rol).toBe('ADMIN');
  });

  it('rechaza login con credenciales inválidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@ici.com.sv', password: 'incorrecta' })
      .expect(401);
  });

  it('inicia sesión y obtiene token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@ici.com.sv', password: 'Secreto123' })
      .expect(200);
    token = res.body.access_token;
    expect(token).toBeDefined();
  });

  it('valida el formato del NIT al crear cliente', async () => {
    await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Cliente X', nit: 'malformato', nrc: '1-1', giro: 'Ferretería' })
      .expect(400);
  });

  it('crea un cliente con datos fiscales', async () => {
    const res = await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Constructora Salvadoreña S.A. de C.V.',
        nit: '0614-123456-101-2',
        nrc: '123456-7',
        giro: 'Construcción',
        direccion: 'San Salvador',
      })
      .expect(201);
    clienteId = res.body.id;
  });

  it('rechaza cliente con NIT duplicado', async () => {
    await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Otro', nit: '0614-123456-101-2', nrc: '9-9', giro: 'Otro' })
      .expect(409);
  });

  it('crea series de FACTURA y NOTA_CREDITO', async () => {
    const fac = await request(app.getHttpServer())
      .post('/series')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipoDocumento: 'FACTURA', prefijo: 'FAC-2026' })
      .expect(201);
    serieFacturaId = fac.body.id;

    const nc = await request(app.getHttpServer())
      .post('/series')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipoDocumento: 'NOTA_CREDITO', prefijo: 'NC-2026' })
      .expect(201);
    serieNotaId = nc.body.id;
  });

  it('emite una factura con IVA calculado automáticamente', async () => {
    const res = await request(app.getHttpServer())
      .post('/facturas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clienteId,
        serieId: serieFacturaId,
        diasCredito: 30,
        lineas: [
          { descripcion: 'Taladro INGCO 850W', cantidad: 2, precioUnitario: 50 },
          { descripcion: 'Disco PFERD 4.5"', cantidad: 10, precioUnitario: 1.5 },
        ],
      })
      .expect(201);
    facturaId = res.body.id;
    expect(res.body.numeroCompleto).toBe('FAC-2026-000001');
    expect(res.body.subtotal).toBe(115);
    expect(res.body.iva).toBe(14.95);
    expect(res.body.total).toBe(129.95);
    expect(res.body.estado).toBe('EMITIDA');
  });

  it('mantiene numeración correlativa única bajo concurrencia', async () => {
    const emitir = () =>
      request(app.getHttpServer())
        .post('/facturas')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clienteId,
          serieId: serieFacturaId,
          lineas: [{ descripcion: 'Pintura ECO PAINT galón', cantidad: 1, precioUnitario: 20 }],
        });

    const respuestas = await Promise.all([emitir(), emitir(), emitir(), emitir(), emitir()]);
    const numeros = respuestas.map((r) => r.body.numero);
    expect(respuestas.every((r) => r.status === 201)).toBe(true);
    expect(new Set(numeros).size).toBe(5);
    facturaAnulableId = respuestas[0].body.id;
  });

  it('registra un pago parcial y pasa a PAGADA_PARCIAL', async () => {
    const res = await request(app.getHttpServer())
      .post(`/facturas/${facturaId}/pagos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 50, metodo: 'TRANSFERENCIA', referencia: 'REF-001' })
      .expect(201);
    expect(res.body.estado).toBe('PAGADA_PARCIAL');
    expect(res.body.saldoPendiente).toBe(79.95);
  });

  it('impide anular una factura que ya tiene pagos', async () => {
    await request(app.getHttpServer())
      .post(`/facturas/${facturaId}/anular`)
      .set('Authorization', `Bearer ${token}`)
      .send({ razon: 'Intento inválido de anulación' })
      .expect(409);
  });

  it('rechaza un pago mayor al saldo pendiente', async () => {
    await request(app.getHttpServer())
      .post(`/facturas/${facturaId}/pagos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 999, metodo: 'EFECTIVO' })
      .expect(400);
  });

  it('impide que la nota de crédito supere el monto original', async () => {
    await request(app.getHttpServer())
      .post('/notas-credito')
      .set('Authorization', `Bearer ${token}`)
      .send({ facturaId, serieId: serieNotaId, monto: 500, razon: 'Monto excesivo' })
      .expect(409);
  });

  it('emite una nota de crédito válida con correlativo propio', async () => {
    const res = await request(app.getHttpServer())
      .post('/notas-credito')
      .set('Authorization', `Bearer ${token}`)
      .send({ facturaId, serieId: serieNotaId, monto: 29.95, razon: 'Devolución de mercadería' })
      .expect(201);
    expect(res.body.numeroCompleto).toBe('NC-2026-000001');
  });

  it('calcula el saldo descontando pagos parciales y notas de crédito', async () => {
    const res = await request(app.getHttpServer())
      .get(`/facturas/${facturaId}/saldo`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.total).toBe(129.95);
    expect(res.body.pagado).toBe(50);
    expect(res.body.notasCredito).toBe(29.95);
    expect(res.body.saldoPendiente).toBe(50);
  });

  it('marca la factura como PAGADA al saldar el total', async () => {
    const res = await request(app.getHttpServer())
      .post(`/facturas/${facturaId}/pagos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monto: 50, metodo: 'EFECTIVO' })
      .expect(201);
    expect(res.body.estado).toBe('PAGADA');
    expect(res.body.saldoPendiente).toBe(0);
  });

  it('anula una factura sin pagos con razón obligatoria y registra bitácora', async () => {
    await request(app.getHttpServer())
      .post(`/facturas/${facturaAnulableId}/anular`)
      .set('Authorization', `Bearer ${token}`)
      .send({ razon: 'Error en datos del cliente' })
      .expect(201);

    const bitacora = await request(app.getHttpServer())
      .get('/bitacora?entidad=FACTURA')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const anulacion = bitacora.body.find((b: any) => b.accion === 'ANULACION' && b.entidadId === facturaAnulableId);
    expect(anulacion).toBeDefined();
    expect(anulacion.estadoNuevo).toBe('ANULADA');
  });

  it('rechaza anulación sin razón', async () => {
    await request(app.getHttpServer())
      .post(`/facturas/${facturaAnulableId}/anular`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('devuelve la conciliación con pendientes, vencidas y pagadas', async () => {
    const res = await request(app.getHttpServer())
      .get('/conciliacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.resumen.pagadas).toBeGreaterThanOrEqual(1);
    expect(res.body.pendientes.length + res.body.vencidas.length + res.body.pagadas.length).toBe(
      res.body.resumen.totalFacturas,
    );
  });

  it('genera el reporte de ventas por período con totales por cliente', async () => {
    const res = await request(app.getHttpServer())
      .get('/reportes/ventas?periodo=dia')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.totalFacturas).toBeGreaterThanOrEqual(5);
    expect(res.body.porCliente[0].cliente).toContain('Constructora');
    expect(res.body.granTotal).toBeGreaterThan(0);
  });

  it('rechaza un período de reporte inválido', async () => {
    await request(app.getHttpServer())
      .get('/reportes/ventas?periodo=anio')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('restringe rutas de ADMIN a usuarios VENTAS', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'vendedor@ici.com.sv', password: 'Secreto123', nombre: 'Vendedor' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'vendedor@ici.com.sv', password: 'Secreto123' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/bitacora')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(403);
  });
});
