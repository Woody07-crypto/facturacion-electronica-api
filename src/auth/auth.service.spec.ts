import { ConflictException, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('asigna ADMIN al primer usuario y VENTAS a los siguientes', async () => {
    const primero = await authService.register({ email: 'uno@ici.com.sv', password: '123456', nombre: 'Uno' });
    const segundo = await authService.register({ email: 'dos@ici.com.sv', password: '123456', nombre: 'Dos' });
    expect(primero.rol).toBe('ADMIN');
    expect(segundo.rol).toBe('VENTAS');
  });

  it('rechaza correos duplicados', async () => {
    await expect(
      authService.register({ email: 'uno@ici.com.sv', password: '123456', nombre: 'Repetido' }),
    ).rejects.toThrow(ConflictException);
  });

  it('entrega un token JWT en login válido', async () => {
    const res = await authService.login({ email: 'uno@ici.com.sv', password: '123456' });
    expect(res.access_token.split('.').length).toBe(3);
    expect(res.usuario.rol).toBe('ADMIN');
  });

  it('rechaza contraseña incorrecta y usuario inexistente', async () => {
    await expect(authService.login({ email: 'uno@ici.com.sv', password: 'mala' })).rejects.toThrow(UnauthorizedException);
    await expect(authService.login({ email: 'nadie@ici.com.sv', password: '123456' })).rejects.toThrow(UnauthorizedException);
  });
});
