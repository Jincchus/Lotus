import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SnakeNamingStrategy } from './snake-naming.strategy';
import { User } from '../users/user.entity';
import { Broker } from '../brokers/broker.entity';
import { Stock } from '../stocks/stock.entity';
import { PriceSnapshot } from '../stocks/price-snapshot.entity';
import { ExchangeRate } from '../exchange-rates/exchange-rate.entity';
import { Lot } from '../lots/lot.entity';
import { Strategy } from '../strategies/strategy.entity';
import { StrategyRule } from '../strategies/strategy-rule.entity';
import { PositionRule } from '../position-rules/position-rule.entity';
import { SellHistory } from '../sell-histories/sell-history.entity';
import { Watchlist } from '../watchlists/watchlist.entity';

const entities = [
  User,
  Broker,
  Stock,
  PriceSnapshot,
  ExchangeRate,
  Lot,
  Strategy,
  StrategyRule,
  PositionRule,
  SellHistory,
  Watchlist,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        username: config.get<string>('db.user'),
        password: config.get<string>('db.password'),
        database: config.get<string>('db.name'),
        entities,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: false,
        namingStrategy: new SnakeNamingStrategy(),
        logging: config.get<string>('app.env') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
