import {
  Column, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn,
} from 'typeorm';
import { Establecimiento } from './establecimiento.entity';

@Entity('emisores')
export class Emisor {
  @PrimaryGeneratedColumn()
  id: number;

  /** NIT con formato ####-######-###-# (dato de negocio; el JSON DTE oficial se mapeará en Fase 3). */
  @Column({ unique: true })
  nit: string;

  @Column()
  nrc: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  nombreComercial: string;

  @Column({ nullable: true })
  codActividad: string;

  @Column({ nullable: true })
  descActividad: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  correo: string;

  @Column({ nullable: true })
  departamento: string;

  @Column({ nullable: true })
  municipio: string;

  @Column({ nullable: true })
  complemento: string;

  /** Ambiente MH por defecto: 00 pruebas, 01 producción. Sin llamadas reales en Fase 1. */
  @Column({ default: '00' })
  ambientePorDefecto: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Establecimiento, (e) => e.emisor, { cascade: true })
  establecimientos: Establecimiento[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
