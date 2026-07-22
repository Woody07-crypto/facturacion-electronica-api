import {
  Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { decimalTransformer } from '../common/utils/decimal.util';
import { NotaCredito } from '../notas-credito/nota-credito.entity';
import { NotaDebito } from '../notas-debito/nota-debito.entity';
import { Pago } from '../pagos/pago.entity';
import { Serie } from '../series/serie.entity';
import { LineaFactura } from './linea-factura.entity';

export enum EstadoFactura {
  EMITIDA = 'EMITIDA',
  PAGADA_PARCIAL = 'PAGADA_PARCIAL',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

@Entity('facturas')
@Unique('UQ_factura_serie_numero', ['serie', 'numero'])
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Serie, { eager: true, nullable: false })
  serie: Serie;

  @Column()
  numero: number;

  @Column()
  numeroCompleto: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.facturas, { eager: true, nullable: false })
  cliente: Cliente;

  @Column({ default: EstadoFactura.EMITIDA })
  estado: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  iva: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  total: number;

  @CreateDateColumn()
  fechaEmision: Date;

  @Column()
  fechaVencimiento: Date;

  @Column({ nullable: true })
  razonAnulacion: string;

  @OneToMany(() => LineaFactura, (linea) => linea.factura, { cascade: true, eager: true })
  lineas: LineaFactura[];

  @OneToMany(() => Pago, (pago) => pago.factura)
  pagos: Pago[];

  @OneToMany(() => NotaCredito, (nota) => nota.factura)
  notasCredito: NotaCredito[];

  @OneToMany(() => NotaDebito, (nota) => nota.factura)
  notasDebito: NotaDebito[];
}
