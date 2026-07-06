import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('series')
@Unique('UQ_serie_tipo_prefijo', ['tipoDocumento', 'prefijo'])
export class Serie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tipoDocumento: string;

  @Column()
  prefijo: string;

  @Column({ default: 0 })
  correlativoActual: number;

  @Column({ default: true })
  activa: boolean;
}
