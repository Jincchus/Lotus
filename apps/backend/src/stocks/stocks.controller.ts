import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StocksService } from './stocks.service';
import { SearchStockDto } from './dto/search-stock.dto';
import { Market } from './stock.entity';

@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('search')
  search(@Query() dto: SearchStockDto) {
    return this.stocksService.search(dto.query, dto.market);
  }

  @Get('price')
  getPrice(
    @Query('symbol') symbol: string,
    @Query('market') market: Market,
  ) {
    return this.stocksService.getPrice(symbol, market);
  }
}
