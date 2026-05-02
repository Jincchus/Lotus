import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Strategy } from './strategy.entity';

@Entity('strategy_rules')
export class StrategyRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Strategy, (strategy) => strategy.rules, {
    onDelete: 'CASCADE',
  })
  strategy: Strategy;

  @Column({
    name: 'target_profit_rate',
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: '목표 수익률 (%)',
  })
  targetProfitRate: number;

  @Column({
    name: 'sell_ratio',
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: '해당 수익률 도달 시 매도 비율 (%)',
  })
  sellRatio: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
