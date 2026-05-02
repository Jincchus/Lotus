import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lot } from '../lots/lot.entity';
import { Strategy } from '../strategies/strategy.entity';
import { Watchlist } from '../watchlists/watchlist.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'google_id', unique: true })
  googleId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'profile_image', type: 'varchar', nullable: true })
  profileImage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Lot, (lot) => lot.user)
  lots: Lot[];

  @OneToMany(() => Strategy, (strategy) => strategy.user)
  strategies: Strategy[];

  @OneToMany(() => Watchlist, (watchlist) => watchlist.user)
  watchlists: Watchlist[];
}
