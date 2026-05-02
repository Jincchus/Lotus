import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Market } from './stock.entity';

@Entity('price_snapshots')
@Unique(['symbol', 'market'])
export class PriceSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  symbol: string;

  @Column({ type: 'enum', enum: Market })
  market: Market;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  price: number;

  @Column({
    name: 'change_rate',
    type: 'decimal',
    precision: 8,
    scale: 4,
    nullable: true,
  })
  changeRate: number | null;

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}
