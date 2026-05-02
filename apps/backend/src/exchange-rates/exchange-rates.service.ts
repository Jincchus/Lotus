import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ExchangeRate } from './exchange-rate.entity';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly rateRepo: Repository<ExchangeRate>,
    private readonly config: ConfigService,
  ) {}

  async getUsdToKrw(): Promise<number> {
    const cached = await this.getValidCache('USD', 'KRW');
    if (cached) return parseFloat(cached.rate as any);

    const rate = await this.fetchFromApi();
    await this.saveCache('USD', 'KRW', rate);
    return rate;
  }

  private async getValidCache(
    from: string,
    to: string,
  ): Promise<ExchangeRate | null> {
    const now = new Date();
    const result = await this.rateRepo
      .createQueryBuilder('er')
      .where('er.from_currency = :from AND er.to_currency = :to', { from, to })
      .andWhere('er.expires_at > :now', { now })
      .orderBy('er.fetched_at', 'DESC')
      .getOne();
    return result;
  }

  private async fetchFromApi(): Promise<number> {
    const apiKey = this.config.get<string>('exchangeRate.apiKey');
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/KRW`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ExchangeRate API error: ${res.status}`);
      const data = (await res.json()) as { conversion_rate: number };
      return data.conversion_rate;
    } catch (err) {
      this.logger.error('ExchangeRate API fetch failed', err);
      // 캐시 만료 여부와 무관하게 가장 최근 값 반환
      const fallback = await this.rateRepo.findOne({
        where: { fromCurrency: 'USD', toCurrency: 'KRW' },
        order: { fetchedAt: 'DESC' },
      });
      if (fallback) return parseFloat(fallback.rate as any);
      throw err;
    }
  }

  private async saveCache(
    from: string,
    to: string,
    rate: number,
  ): Promise<void> {
    const ttlMinutes = this.config.get<number>('exchangeRate.cacheTtlMinutes', 60);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    await this.rateRepo.save(
      this.rateRepo.create({ fromCurrency: from, toCurrency: to, rate, fetchedAt: now, expiresAt }),
    );
  }

  async getCurrentRate(): Promise<{ rate: number; fetchedAt: Date }> {
    const rate = await this.getUsdToKrw();
    return { rate, fetchedAt: new Date() };
  }

  async getRateByDate(date: string): Promise<{ rate: number; source: 'db' | 'current' }> {
    const result = await this.rateRepo
      .createQueryBuilder('er')
      .where('er.from_currency = :from AND er.to_currency = :to', { from: 'USD', to: 'KRW' })
      .andWhere("DATE(er.fetched_at AT TIME ZONE 'Asia/Seoul') = :date", { date })
      .orderBy('er.fetched_at', 'DESC')
      .getOne();

    if (result) return { rate: parseFloat(result.rate as any), source: 'db' };

    const rate = await this.getUsdToKrw();
    return { rate, source: 'current' };
  }
}
