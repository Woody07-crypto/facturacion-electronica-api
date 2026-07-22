import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './helpers';

describe('Emisor — establecimientos y puntos de venta (e2e)', () => {
  let app: INestApplication;
  let tokenAdmin: string;
  let tokenVentas: string;
  let emisorId: number;
  let establecimientoId: number;
  let puntoVentaId: number;

  beforeAll(async () => {
    app = await crearApp();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'admin-emisor@esen.com.sv', password: 'Secreto123', nombre: 'Admin Emisor' });
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-emisor@esen.com.sv', password: 'Secreto123' });
    tokenAdmin = loginAdmin.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ventas-emisor@esen.com.sv', password: 'Secreto123', nombre: 'Ventas' });
    const loginVentas = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ventas-emisor@esen.com.sv', password: 'Secreto123' });
    tokenVentas = loginVentas.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza crear emisor sin rol ADMIN', async () => {
    await request(app.getHttpServer())
      .post('/emisor')
      .set('Authorization', `Bearer ${tokenVentas}`)
      .send({
        nit: '0614-290313-101-3',
        nrc: '11111-1',
        nombre: 'Emisor Demo S.A. de C.V.',
      })
      .expect(403);
  });

  it('crea el emisor activo con ambiente 00 por defecto', async () => {
    const res = await request(app.getHttpServer())
      .post('/emisor')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nit: '0614-290313-101-3',
        nrc: '123456-7',
        nombre: 'Comercializadora Demo S.A. de C.V.',
        nombreComercial: 'Demo Store',
        codActividad: '46452',
        descActividad: 'Venta al por menor',
        departamento: 'San Salvador',
        municipio: 'San Salvador',
        complemento: 'Col. Escalón #10',
      })
      .expect(201);
    emisorId = res.body.id;
    expect(res.body.ambientePorDefecto).toBe('00');
    expect(res.body.activo).toBe(true);
  });

  it('impide un segundo emisor activo', async () => {
    await request(app.getHttpServer())
      .post('/emisor')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nit: '0614-111111-101-1',
        nrc: '99999-9',
        nombre: 'Otro Emisor',
      })
      .expect(409);
  });

  it('crea establecimiento y punto de venta', async () => {
    const est = await request(app.getHttpServer())
      .post('/emisor/establecimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        codigo: '0000',
        tipoEstablecimiento: '01',
        nombre: 'Casa matriz',
        direccion: 'Col. Escalón, San Salvador',
      })
      .expect(201);
    establecimientoId = est.body.id;

    const pv = await request(app.getHttpServer())
      .post(`/emisor/establecimientos/${establecimientoId}/puntos-venta`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ codigo: '001', nombre: 'Caja principal' })
      .expect(201);
    puntoVentaId = pv.body.id;
    expect(pv.body.codigo).toBe('001');
  });

  it('rechaza código de establecimiento o PV duplicado', async () => {
    await request(app.getHttpServer())
      .post('/emisor/establecimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ codigo: '0000', tipoEstablecimiento: '01', nombre: 'Duplicado' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/emisor/establecimientos/${establecimientoId}/puntos-venta`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ codigo: '001', nombre: 'Duplicado' })
      .expect(409);
  });

  it('consulta emisor activo con jerarquía', async () => {
    const res = await request(app.getHttpServer())
      .get('/emisor/activo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(res.body.id).toBe(emisorId);
    expect(res.body.establecimientos.length).toBeGreaterThanOrEqual(1);
    expect(res.body.establecimientos[0].puntosVenta.length).toBeGreaterThanOrEqual(1);
  });

  it('desactiva punto de venta, establecimiento y emisor', async () => {
    await request(app.getHttpServer())
      .delete(`/emisor/puntos-venta/${puntoVentaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/emisor/establecimientos/${establecimientoId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/emisor/${emisorId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/emisor/activo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);
  });
});
