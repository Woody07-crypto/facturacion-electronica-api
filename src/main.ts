import 'reflect-metadata';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  const config = new DocumentBuilder()
    .setTitle('Plataforma de Facturación Electrónica')
    .setDescription('API para emisión, gestión y consulta de documentos tributarios electrónicos (facturas, notas de crédito, notas de débito), con control de series, estados, conciliación de pagos y módulo Emisor (DTE Fase 1).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const puerto = process.env.PORT || 3000;
  await app.listen(puerto);
  console.log(`Interfaz: http://localhost:${puerto}/`);
  console.log(`Swagger:  http://localhost:${puerto}/api/docs`);
}
bootstrap();
