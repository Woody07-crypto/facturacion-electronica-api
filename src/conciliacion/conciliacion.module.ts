import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../facturas/factura.entity';
import { FacturasModule } from '../facturas/facturas.module';
import { ConciliacionController } from './conciliacion.controller';
import { ConciliacionService } from './conciliacion.service';

@Module({
  imports: [TypeOrmModule.forFeature([Factura]), FacturasModule],
  controllers: [ConciliacionController],
  providers: [ConciliacionService],
})
export class ConciliacionModule {}
