import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../common/utils/decimal.util';
import { Factura } from '../facturas/factura.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Factura, (factura) => factura.pagos, { nullable: false })
  factura: Factura;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  monto: number;

  @Column()
  metodo: string;

  @Column({ nullable: true })
  referencia: string;

  @Column({ nullable: true })
  registradoPor: string;

  @CreateDateColumn()
  fecha: Date;
}
