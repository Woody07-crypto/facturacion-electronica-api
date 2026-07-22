import {
  Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Emisor } from './emisor.entity';
import { PuntoVenta } from './punto-venta.entity';

@Entity('establecimientos')
@Unique('UQ_establecimiento_emisor_codigo', ['emisor', 'codigo'])
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Emisor, (emisor) => emisor.establecimientos, { nullable: false, onDelete: 'CASCADE' })
  emisor: Emisor;

  /** Código interno (ej. 0000 casa matriz). CAT-009 se amarrará en Fase 2. */
  @Column()
  codigo: string;

  /**
   * Tipo de establecimiento (texto libre en Fase 1).
   * Fase 2 lo validará contra CAT-009 oficial del MH.
   */
  @Column()
  tipoEstablecimiento: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => PuntoVenta, (pv) => pv.establecimiento, { cascade: true })
  puntosVenta: PuntoVenta[];
}
