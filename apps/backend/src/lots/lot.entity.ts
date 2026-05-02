import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Stock } from '../stocks/stock.entity';
import { Broker } from '../brokers/broker.entity';
import { PositionRule } from '../position-rules/position-rule.entity';
import { SellHistory } from '../sell-histories/sell-history.entity';

@Entity('lots')
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.lots, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Stock, (stock) => stock.lots, { eager: true })
  stock: Stock;

  @ManyToOne(() => Broker, (broker) => broker.lots, { eager: true })
  broker: Broker;

  @Column({
    name: 'purchase_price',
    type: 'decimal',
    precision: 18,
    scale: 8,
    comment: '매수가 (stock.currency 기준)',
  })
  purchasePrice: number;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: string;

  @Column({
    name: 'initial_quantity',
    type: 'decimal',
    precision: 18,
    scale: 8,
    comment: '최초 매수 수량 — 변경 불가 기준값',
  })
  initialQuantity: number;

  @Column({
    name: 'remaining_quantity',
    type: 'decimal',
    precision: 18,
    scale: 8,
    comment: '부분 매도 후 잔여 수량',
  })
  remainingQuantity: number;

  @Column({
    name: 'exchange_rate_at_purchase',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    comment: 'USD 종목 매수 시점 환율 (KRW/USD). KRW 종목은 null',
  })
  exchangeRateAtPurchase: number | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => PositionRule, (rule) => rule.lot, { cascade: true })
  positionRules: PositionRule[];

  @OneToMany(() => SellHistory, (history) => history.lot)
  sellHistories: SellHistory[];
}
