import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BitacoraModule } from './bitacora/bitacora.module';
import { ClientesModule } from './clientes/clientes.module';
import { ConciliacionModule } from './conciliacion/conciliacion.module';
import { buildDbConfig } from './database/database.config';
import { FacturasModule } from './facturas/facturas.module';
import { NotasCreditoModule } from './notas-credito/notas-credito.module';
import { NotasDebitoModule } from './notas-debito/notas-debito.module';
import { PagosModule } from './pagos/pagos.module';
import { ReportesModule } from './reportes/reportes.module';
import { SeriesModule } from './series/series.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(buildDbConfig()),
    AuthModule,
    ClientesModule,
    SeriesModule,
    FacturasModule,
    PagosModule,
    NotasCreditoModule,
    NotasDebitoModule,
    ConciliacionModule,
    ReportesModule,
    BitacoraModule,
  ],
})
export class AppModule {}
