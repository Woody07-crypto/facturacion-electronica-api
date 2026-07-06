import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Factura } from '../facturas/factura.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ unique: true })
  nit: string;

  @Column()
  nrc: string;

  @Column()
  giro: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  correo: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Factura, (factura) => factura.cliente)
  facturas: Factura[];
}
