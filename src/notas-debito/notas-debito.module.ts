import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturasModule } from '../facturas/facturas.module';
import { NotaDebito } from './nota-debito.entity';
import { NotasDebitoController } from './notas-debito.controller';
import { NotasDebitoService } from './notas-debito.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotaDebito]), FacturasModule],
  controllers: [NotasDebitoController],
  providers: [NotasDebitoService],
})
export class NotasDebitoModule {}
