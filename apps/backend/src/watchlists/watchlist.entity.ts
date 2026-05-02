import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Currency, Market } from '../stocks/stock.entity';

@Entity('watchlists')
@Unique(['user', 'symbol', 'market'])
export class Watchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.watchlists, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 20 })
  symbol: string;

  @Column({ type: 'enum', enum: Market })
  market: Market;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
