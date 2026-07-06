import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturasModule } from '../facturas/facturas.module';
import { NotaCredito } from './nota-credito.entity';
import { NotasCreditoController } from './notas-credito.controller';
import { NotasCreditoService } from './notas-credito.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotaCredito]), FacturasModule],
  controllers: [NotasCreditoController],
  providers: [NotasCreditoService],
})
export class NotasCreditoModule {}
