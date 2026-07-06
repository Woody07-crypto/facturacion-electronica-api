import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './helpers';

describe('CRUD y consultas complementarias (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let clienteId: number;

  beforeAll(async () => {
    app = await crearApp();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'admin2@ici.com.sv', password: 'Secreto123', nombre: 'Admin' });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin2@ici.com.sv', password: 'Secreto123' });
    token = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza un token inválido', async () => {
    await request(app.getHttpServer()).get('/clientes').set('Authorization', 'Bearer token-falso').expect(401);
  });

  it('crea, consulta, actualiza y desactiva un cliente', async () => {
    const creado = await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Cliente CRUD', nit: '0614-777777-101-9', nrc: '77777-7', giro: 'Comercio' })
      .expect(201);
    clienteId = creado.body.id;

    const obtenido = await request(app.getHttpServer())
      .get(`/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(obtenido.body.nit).toBe('0614-777777-101-9');

    const actualizado = await request(app.getHttpServer())
      .patch(`/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ direccion: 'Calle Los Sisimiles #3181' })
      .expect(200);
    expect(actualizado.body.direccion).toBe('Calle Los Sisimiles #3181');

    const listado = await request(app.getHttpServer())
      .get('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listado.body.some((c: any) => c.id === clienteId)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/clientes/${clienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listadoFinal = await request(app.getHttpServer())
      .get('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listadoFinal.body.some((c: any) => c.id === clienteId)).toBe(false);
  });

  it('rechaza actualizar el NIT a uno ya existente', async () => {
    const a = await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'A', nit: '0614-000001-101-1', nrc: '1-1', giro: 'G' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'B', nit: '0614-000002-101-1', nrc: '2-2', giro: 'G' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/clientes/${a.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nit: '0614-000002-101-1' })
      .expect(409);
  });

  it('devuelve 404 para recursos inexistentes', async () => {
    await request(app.getHttpServer()).get('/clientes/9999').set('Authorization', `Bearer ${token}`).expect(404);
    await request(app.getHttpServer()).get('/facturas/9999').set('Authorization', `Bearer ${token}`).expect(404);
    await request(app.getHttpServer()).get('/series/9999').set('Authorization', `Bearer ${token}`).expect(404);
    await request(app.getHttpServer()).get('/notas-credito/9999').set('Authorization', `Bearer ${token}`).expect(404);
  });

  it('lista series, facturas y notas de crédito', async () => {
    await request(app.getHttpServer())
      .post('/series')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipoDocumento: 'FACTURA', prefijo: 'FC-2026' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/series')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipoDocumento: 'FACTURA', prefijo: 'FC-2026' })
      .expect(409);

    const series = await request(app.getHttpServer()).get('/series').set('Authorization', `Bearer ${token}`).expect(200);
    expect(series.body.length).toBeGreaterThanOrEqual(1);
    await request(app.getHttpServer())
      .get(`/series/${series.body[0].id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer()).get('/facturas').set('Authorization', `Bearer ${token}`).expect(200);
    await request(app.getHttpServer()).get('/notas-credito').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('rechaza cuerpos con propiedades no permitidas', async () => {
    await request(app.getHttpServer())
      .post('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X', nit: '0614-333333-101-3', nrc: '3-3', giro: 'G', campoExtra: 'no' })
      .expect(400);
  });
});
