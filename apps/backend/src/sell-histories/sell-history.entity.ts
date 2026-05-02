import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lot } from '../lots/lot.entity';
import { PositionRule } from '../position-rules/position-rule.entity';

export enum SellType {
  MANUAL = 'MANUAL',
  STRATEGY = 'STRATEGY',
}

@Entity('sell_histories')
export class SellHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Lot, (lot) => lot.sellHistories, { onDelete: 'CASCADE' })
  lot: Lot;

  /**
   * 전략 매도의 경우 연결, 수동 매도의 경우 null.
   * PositionRule 삭제 시에도 SellHistory는 보존 (SET NULL).
   */
  @ManyToOne(() => PositionRule, (rule) => rule.sellHistories, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  positionRule: PositionRule | null;

  @Column({
    name: 'sell_price',
    type: 'decimal',
    precision: 18,
    scale: 8,
    comment: '매도가 (lot.stock.currency 기준)',
  })
  sellPrice: number;

  @Column({
    name: 'sell_quantity',
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  sellQuantity: number;

  @Column({ name: 'sell_date', type: 'date' })
  sellDate: string;

  @Column({
    name: 'trigger_profit_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    comment: '매도 실행 시점의 실제 수익률 (%)',
  })
  triggerProfitRate: number | null;

  @Column({
    name: 'realized_profit',
    type: 'decimal',
    precision: 18,
    scale: 8,
    comment: '실현 수익 (lot.stock.currency 기준, 수수료 미포함)',
  })
  realizedProfit: number;

  @Column({
    name: 'exchange_rate_at_sell',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    comment: 'USD 종목의 경우 매도 시점 환율 (KRW/USD)',
  })
  exchangeRateAtSell: number | null;

  @Column({
    name: 'sell_type',
    type: 'enum',
    enum: SellType,
    default: SellType.MANUAL,
  })
  sellType: SellType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
