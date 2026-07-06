import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { Serie } from '../series/serie.entity';
import { Factura } from './factura.entity';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { LineaFactura } from './linea-factura.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Factura, LineaFactura, Cliente, Serie])],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
