import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturasModule } from '../facturas/facturas.module';
import { Pago } from './pago.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pago]), FacturasModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
