import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Lot } from '../lots/lot.entity';

export enum Market {
  KR = 'KR',
  US = 'US',
}

export enum Currency {
  KRW = 'KRW',
  USD = 'USD',
}

@Entity('stocks')
@Unique(['symbol', 'market'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  symbol: string;

  @Column({ type: 'enum', enum: Market })
  market: Market;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Lot, (lot) => lot.stock)
  lots: Lot[];
}
