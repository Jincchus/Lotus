import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot } from '../lots/lot.entity';
import { SellHistory } from '../sell-histories/sell-history.entity';
import { PositionRule } from '../position-rules/position-rule.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { StocksModule } from '../stocks/stocks.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lot, SellHistory, PositionRule]),
    StocksModule,
    ExchangeRatesModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
