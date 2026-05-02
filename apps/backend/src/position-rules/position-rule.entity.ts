import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lot } from '../lots/lot.entity';
import { Strategy } from '../strategies/strategy.entity';
import { SellHistory } from '../sell-histories/sell-history.entity';

@Entity('position_rules')
export class PositionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Lot, (lot) => lot.positionRules, { onDelete: 'CASCADE' })
  lot: Lot;

  /**
   * 어느 Strategy에서 복사됐는지 참고용 (nullable).
   * Strategy 삭제 후에도 PositionRule은 유지되어야 하므로 SET NULL.
   */
  @ManyToOne(() => Strategy, { nullable: true, onDelete: 'SET NULL' })
  sourceStrategy: Strategy | null;

  @Column({
    name: 'target_profit_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: 'Strategy 적용 시점에 복사된 목표 수익률 (%)',
  })
  targetProfitRate: number;

  @Column({
    name: 'sell_ratio',
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: 'Strategy 적용 시점에 복사된 매도 비율 (%)',
  })
  sellRatio: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'is_executed', default: false })
  isExecuted: boolean;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SellHistory, (history) => history.positionRule)
  sellHistories: SellHistory[];
}
