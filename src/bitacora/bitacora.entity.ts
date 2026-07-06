import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bitacora')
export class Bitacora {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entidad: string;

  @Column()
  entidadId: number;

  @Column()
  accion: string;

  @Column({ nullable: true })
  estadoAnterior: string;

  @Column({ nullable: true })
  estadoNuevo: string;

  @Column({ nullable: true })
  detalle: string;

  @Column({ nullable: true })
  usuario: string;

  @CreateDateColumn()
  fecha: Date;
}
