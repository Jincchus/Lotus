import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist } from './watchlist.entity';
import { Currency, Market } from '../stocks/stock.entity';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';
import { StocksService } from '../stocks/stocks.service';

export interface WatchlistItemDto {
  id: string;
  symbol: string;
  market: string;
  currency: string;
  stockName: string;
  memo: string | null;
  createdAt: Date;
  currentPrice: number | null;
  changeRate: number | null;
}

@Injectable()
export class WatchlistsService {
  constructor(
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
    private readonly stocksService: StocksService,
  ) {}

  async create(userId: string, dto: CreateWatchlistDto): Promise<WatchlistItemDto> {
    const exists = await this.watchlistRepo.findOne({
      where: { user: { id: userId }, symbol: dto.symbol, market: dto.market },
    });
    if (exists) throw new ConflictException('이미 관심종목에 등록되어 있습니다.');

    const currency =
      dto.market === Market.KR ? Currency.KRW : Currency.USD;

    const saved = await this.watchlistRepo.save(
      this.watchlistRepo.create({
        user: { id: userId },
        symbol: dto.symbol,
        market: dto.market,
        name: dto.stockName,
        currency,
        memo: dto.memo ?? null,
      }),
    );

    return this.toDto(saved);
  }

  async findAll(userId: string): Promise<WatchlistItemDto[]> {
    const rows = await this.watchlistRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return [];

    const priceMap = await this.stocksService.getMultiplePrices(
      rows.map((r) => ({ symbol: r.symbol, market: r.market as Market })),
    );

    return rows.map((r) => {
      const price = priceMap.get(r.symbol);
      return {
        ...this.toDto(r),
        currentPrice: price?.price ?? null,
        changeRate: price?.changeRate ?? null,
      };
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const item = await this.watchlistRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!item) throw new NotFoundException('관심종목을 찾을 수 없습니다.');
    await this.watchlistRepo.delete(id);
  }

  private toDto(w: Watchlist): WatchlistItemDto {
    return {
      id: w.id,
      symbol: w.symbol,
      market: w.market,
      currency: w.currency,
      stockName: w.name,
      memo: w.memo,
      createdAt: w.createdAt,
      currentPrice: null,
      changeRate: null,
    };
  }
}
