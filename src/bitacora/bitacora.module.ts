import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bitacora } from './bitacora.entity';
import { BitacoraController } from './bitacora.controller';
import { BitacoraListener } from './bitacora.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Bitacora])],
  controllers: [BitacoraController],
  providers: [BitacoraListener],
})
export class BitacoraModule {}
