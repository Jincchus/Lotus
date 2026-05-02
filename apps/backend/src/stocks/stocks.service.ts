import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import YahooFinanceClass from 'yahoo-finance2';
import { Stock, Market, Currency } from './stock.entity';
import { PriceSnapshot } from './price-snapshot.entity';

// yahoo-finance2 v3: new YahooFinance() (no args) uses built-in cookie/crumb handling
const yahooFinance = new (YahooFinanceClass as any)();

const PRICE_CACHE_TTL_SECONDS = 300;

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  exchange: string;
}

export interface StockPrice {
  symbol: string;
  market: Market;
  price: number;
  changeRate: number | null;
  cachedAt: Date;
}

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(PriceSnapshot)
    private readonly snapshotRepo: Repository<PriceSnapshot>,
  ) {}

  async search(query: string, market: Market): Promise<StockSearchResult[]> {
    try {
      const results = await yahooFinance.search(
        query,
        {},
        { validateResult: false },
      ) as any;
      const quotes: any[] = results.quotes ?? [];

      return quotes
        .filter((q: any) => {
          if (q.quoteType !== 'EQUITY') return false;
          if (market === Market.KR) {
            return q.symbol?.endsWith('.KS') || q.symbol?.endsWith('.KQ');
          }
          return (
            !q.symbol?.includes('.') &&
            ['NMS', 'NYQ', 'NGM', 'ASE', 'PCX', 'BTS'].includes(q.exchange)
          );
        })
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname ?? q.longname ?? q.symbol,
          market,
          currency: market === Market.KR ? Currency.KRW : Currency.USD,
          exchange: q.exchange ?? '',
        }));
    } catch (err) {
      this.logger.error(`Stock search failed for query: ${query}`, err);
      return [];
    }
  }

  async getPrice(symbol: string, market: Market): Promise<StockPrice> {
    const cached = await this.getValidPriceCache(symbol, market);
    if (cached) {
      return {
        symbol,
        market,
        price: parseFloat(cached.price as any),
        changeRate: cached.changeRate !== null ? parseFloat(cached.changeRate as any) : null,
        cachedAt: cached.fetchedAt,
      };
    }

    return this.fetchAndCachePrice(symbol, market);
  }

  async getMultiplePrices(
    items: { symbol: string; market: Market }[],
  ): Promise<Map<string, StockPrice>> {
    const result = new Map<string, StockPrice>();
    await Promise.all(
      items.map(async ({ symbol, market }) => {
        try {
          const price = await this.getPrice(symbol, market);
          result.set(symbol, price);
        } catch {
          // 가격 조회 실패 시 해당 종목 건너뜀
        }
      }),
    );
    return result;
  }

  async findOrCreate(symbol: string, market: Market): Promise<Stock> {
    const existing = await this.stockRepo.findOne({
      where: { symbol, market },
    });
    if (existing) return existing;

    try {
      const quote = await yahooFinance.quote(symbol) as any;
      return this.stockRepo.save(
        this.stockRepo.create({
          symbol,
          market,
          name: quote.shortName ?? quote.longName ?? symbol,
          currency: market === Market.KR ? Currency.KRW : Currency.USD,
        }),
      );
    } catch {
      throw new NotFoundException(`종목을 찾을 수 없습니다: ${symbol}`);
    }
  }

  private async getValidPriceCache(
    symbol: string,
    market: Market,
  ): Promise<PriceSnapshot | null> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { symbol, market },
    });
    if (!snapshot) return null;
    if (new Date() > snapshot.expiresAt) return null;
    return snapshot;
  }

  private async fetchAndCachePrice(
    symbol: string,
    market: Market,
  ): Promise<StockPrice> {
    const quote = await yahooFinance.quote(symbol) as any;
    const price = quote.regularMarketPrice as number;
    const changeRate = (quote.regularMarketChangePercent as number) ?? null;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PRICE_CACHE_TTL_SECONDS * 1000);

    await this.snapshotRepo.upsert(
      { symbol, market, price, changeRate, fetchedAt: now, expiresAt },
      ['symbol', 'market'],
    );

    return { symbol, market, price, changeRate, cachedAt: now };
  }
}
