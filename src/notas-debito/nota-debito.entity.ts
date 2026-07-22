import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { decimalTransformer } from '../common/utils/decimal.util';
import { Factura } from '../facturas/factura.entity';
import { Serie } from '../series/serie.entity';

@Entity('notas_debito')
@Unique('UQ_nota_debito_serie_numero', ['serie', 'numero'])
export class NotaDebito {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Serie, { eager: true, nullable: false })
  serie: Serie;

  @Column()
  numero: number;

  @Column()
  numeroCompleto: string;

  @ManyToOne(() => Factura, (factura) => factura.notasDebito, { nullable: false })
  factura: Factura;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  monto: number;

  @Column()
  razon: string;

  @Column({ nullable: true })
  emitidaPor: string;

  @CreateDateColumn()
  fechaEmision: Date;
}
