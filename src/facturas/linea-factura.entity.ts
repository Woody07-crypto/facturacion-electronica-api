import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../common/utils/decimal.util';
import { Factura } from './factura.entity';

@Entity('lineas_factura')
export class LineaFactura {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Factura, (factura) => factura.lineas, { onDelete: 'CASCADE', nullable: false })
  factura: Factura;

  @Column()
  descripcion: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  precioUnitario: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  iva: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  total: number;
}
