import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellHistory } from './sell-history.entity';
import { Lot } from '../lots/lot.entity';
import { SellHistoriesService } from './sell-histories.service';
import { SellHistoriesController } from './sell-histories.controller';
import { LotsModule } from '../lots/lots.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SellHistory, Lot]),
    LotsModule,
    ExchangeRatesModule,
  ],
  providers: [SellHistoriesService],
  controllers: [SellHistoriesController],
})
export class SellHistoriesModule {}
