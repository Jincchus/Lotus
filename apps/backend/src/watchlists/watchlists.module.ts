import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watchlist } from './watchlist.entity';
import { WatchlistsService } from './watchlists.service';
import { WatchlistsController } from './watchlists.controller';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Watchlist]), StocksModule],
  providers: [WatchlistsService],
  controllers: [WatchlistsController],
})
export class WatchlistsModule {}
