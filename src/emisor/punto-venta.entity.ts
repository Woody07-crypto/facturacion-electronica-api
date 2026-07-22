import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Establecimiento } from './establecimiento.entity';

@Entity('puntos_venta')
@Unique('UQ_punto_venta_establecimiento_codigo', ['establecimiento', 'codigo'])
export class PuntoVenta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Establecimiento, (e) => e.puntosVenta, { nullable: false, onDelete: 'CASCADE' })
  establecimiento: Establecimiento;

  /** Código interno del PV (ej. 001). */
  @Column()
  codigo: string;

  @Column()
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}
