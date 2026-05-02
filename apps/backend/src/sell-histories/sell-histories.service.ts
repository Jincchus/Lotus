import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SellHistory, SellType } from './sell-history.entity';
import { Lot } from '../lots/lot.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { ExecuteSellDto } from './dto/execute-sell.dto';
import { Currency } from '../stocks/stock.entity';

export interface SellHistoryDto {
  id: string;
  lotId: string;
  stockName: string;
  symbol: string;
  market: string;
  currency: string;
  sellPrice: number;
  sellQuantity: number;
  sellDate: string;
  realizedProfit: number;
  realizedProfitKrw: number;   // 원화 환산 실현수익
  sellAmountKrw: number;        // 원화 환산 매도금액
  sellType: string;
  triggerProfitRate: number | null;
  exchangeRateAtSell: number | null;
  positionRuleId: string | null;
  createdAt: Date;
}

export interface MonthlyStatsDto {
  year: number;
  month: number;
  totalSellAmount: number;
  realizedProfit: number;
  returnRate: number;
}

@Injectable()
export class SellHistoriesService {
  constructor(
    @InjectRepository(SellHistory)
    private readonly historyRepo: Repository<SellHistory>,
    @InjectRepository(Lot)
    private readonly lotRepo: Repository<Lot>,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    lotId: string,
    userId: string,
    dto: ExecuteSellDto,
  ): Promise<SellHistory> {
    // 전략은 알림 전용 — API 레벨에서 STRATEGY 매도 차단
    if (dto.sellType === SellType.STRATEGY) {
      throw new BadRequestException(
        '전략 매도는 지원하지 않습니다. 수동 매도(MANUAL)만 가능합니다.',
      );
    }

    // 외부 API 호출은 transaction 바깥에서 처리
    const exchangeRate = await this.exchangeRatesService.getUsdToKrw();

    return this.dataSource.transaction(async (manager) => {
      // FOR UPDATE는 INNER JOIN에서만 허용 — QueryBuilder로 row lock
      const lot = await manager
        .createQueryBuilder(Lot, 'lot')
        .innerJoinAndSelect('lot.stock', 'stock')
        .innerJoin('lot.user', 'user')
        .where('lot.id = :lotId AND user.id = :userId', { lotId, userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!lot) throw new NotFoundException('Lot을 찾을 수 없습니다.');

      const remaining = parseFloat(lot.remainingQuantity as any);
      if (remaining < dto.sellQuantity) {
        throw new BadRequestException(
          `잔여 수량 부족: 잔여 ${remaining}, 요청 ${dto.sellQuantity}`,
        );
      }

      const purchasePrice = parseFloat(lot.purchasePrice as any);
      const realizedProfit = (dto.sellPrice - purchasePrice) * dto.sellQuantity;
      const triggerProfitRate =
        ((dto.sellPrice - purchasePrice) / purchasePrice) * 100;

      const exchangeRateAtSell =
        lot.stock.currency === Currency.USD ? exchangeRate : null;

      await manager.update(Lot, lotId, {
        remainingQuantity: remaining - dto.sellQuantity,
      });

      const history = manager.create(SellHistory, {
        lot: { id: lotId },
        sellPrice: dto.sellPrice,
        sellQuantity: dto.sellQuantity,
        sellDate: dto.sellDate,
        triggerProfitRate: parseFloat(triggerProfitRate.toFixed(2)),
        realizedProfit,
        exchangeRateAtSell,
        sellType: dto.sellType,
      });

      return manager.save(SellHistory, history);
    });
  }

  async findByLot(lotId: string, userId: string): Promise<SellHistoryDto[]> {
    const rows = await this.historyRepo
      .createQueryBuilder('sh')
      .innerJoinAndSelect('sh.lot', 'lot')
      .innerJoinAndSelect('lot.stock', 'stock')
      .innerJoin('lot.user', 'user')
      .leftJoinAndSelect('sh.positionRule', 'pr')
      .where('lot.id = :lotId AND user.id = :userId', { lotId, userId })
      .orderBy('sh.sellDate', 'DESC')
      .getMany();

    return rows.map(this.toDto);
  }

  async findAll(userId: string): Promise<SellHistoryDto[]> {
    const rows = await this.historyRepo
      .createQueryBuilder('sh')
      .innerJoinAndSelect('sh.lot', 'lot')
      .innerJoinAndSelect('lot.stock', 'stock')
      .innerJoin('lot.user', 'user')
      .leftJoinAndSelect('sh.positionRule', 'pr')
      .where('user.id = :userId', { userId })
      .orderBy('sh.sellDate', 'DESC')
      .getMany();

    return rows.map(this.toDto);
  }

  async getMonthlyStats(userId: string, year?: number): Promise<MonthlyStatsDto[]> {
    const exchangeRate = await this.exchangeRatesService.getUsdToKrw();

    const qb = this.historyRepo
      .createQueryBuilder('sh')
      .innerJoinAndSelect('sh.lot', 'lot')
      .innerJoinAndSelect('lot.stock', 'stock')
      .innerJoin('lot.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('sh.sell_date', 'DESC');

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM sh.sell_date) = :year', { year });
    }

    const rows = await qb.getMany();

    const map = new Map<string, {
      year: number; month: number;
      totalSellAmount: number; realizedProfit: number; totalInvestment: number;
    }>();

    for (const h of rows) {
      const d = new Date(h.sellDate);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${m}`;
      const isUsd = h.lot.stock.currency === Currency.USD;
      const rate = isUsd
        ? (h.exchangeRateAtSell ? parseFloat(h.exchangeRateAtSell as any) : exchangeRate)
        : 1;
      const sellPrice = parseFloat(h.sellPrice as any);
      const purchasePrice = parseFloat(h.lot.purchasePrice as any);
      const qty = parseFloat(h.sellQuantity as any);

      if (!map.has(key)) {
        map.set(key, { year: y, month: m, totalSellAmount: 0, realizedProfit: 0, totalInvestment: 0 });
      }
      const stat = map.get(key)!;
      stat.totalSellAmount += sellPrice * qty * rate;
      stat.realizedProfit += parseFloat(h.realizedProfit as any) * rate;
      stat.totalInvestment += purchasePrice * qty * rate;
    }

    return Array.from(map.values())
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
      .map((s) => ({
        year: s.year,
        month: s.month,
        totalSellAmount: Math.round(s.totalSellAmount),
        realizedProfit: Math.round(s.realizedProfit),
        returnRate: s.totalInvestment > 0
          ? parseFloat(((s.realizedProfit / s.totalInvestment) * 100).toFixed(2))
          : 0,
      }));
  }

  private toDto = (h: SellHistory): SellHistoryDto => {
    const sellPrice = parseFloat(h.sellPrice as any);
    const qty = parseFloat(h.sellQuantity as any);
    const profit = parseFloat(h.realizedProfit as any);
    const isUsd = (h.lot as any)?.stock?.currency === Currency.USD;
    const rate = isUsd && h.exchangeRateAtSell
      ? parseFloat(h.exchangeRateAtSell as any)
      : 1;

    return {
      id: h.id,
      lotId: h.lot?.id ?? '',
      stockName: (h.lot as any)?.stock?.name ?? '',
      symbol: (h.lot as any)?.stock?.symbol ?? '',
      market: (h.lot as any)?.stock?.market ?? '',
      currency: (h.lot as any)?.stock?.currency ?? '',
      sellPrice,
      sellQuantity: qty,
      sellDate: h.sellDate,
      realizedProfit: profit,
      realizedProfitKrw: Math.round(profit * rate),
      sellAmountKrw: Math.round(sellPrice * qty * rate),
      sellType: h.sellType,
      triggerProfitRate: h.triggerProfitRate != null ? parseFloat(h.triggerProfitRate as any) : null,
      exchangeRateAtSell: h.exchangeRateAtSell != null ? parseFloat(h.exchangeRateAtSell as any) : null,
      positionRuleId: h.positionRule?.id ?? null,
      createdAt: h.createdAt,
    };
  };
}
