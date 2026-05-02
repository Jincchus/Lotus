import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot } from './lot.entity';
import { Broker } from '../brokers/broker.entity';
import { LotsService } from './lots.service';
import { LotsController } from './lots.controller';
import { StocksModule } from '../stocks/stocks.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lot, Broker]), StocksModule, ExchangeRatesModule],
  providers: [LotsService],
  controllers: [LotsController],
  exports: [LotsService],
})
export class LotsModule {}
