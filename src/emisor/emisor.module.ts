import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmisorController } from './emisor.controller';
import { Emisor } from './emisor.entity';
import { EmisorService } from './emisor.service';
import { Establecimiento } from './establecimiento.entity';
import { PuntoVenta } from './punto-venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Emisor, Establecimiento, PuntoVenta])],
  controllers: [EmisorController],
  providers: [EmisorService],
  exports: [EmisorService],
})
export class EmisorModule {}
