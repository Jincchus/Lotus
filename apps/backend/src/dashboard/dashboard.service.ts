import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lot } from '../lots/lot.entity';
import { SellHistory } from '../sell-histories/sell-history.entity';
import { PositionRule } from '../position-rules/position-rule.entity';
import { StocksService } from '../stocks/stocks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Currency } from '../stocks/stock.entity';

export interface ActionableLotDto {
  lotId: string;
  stockName: string;
  symbol: string;
  market: string;
  currency: string;
  returnRate: number;
  currentPrice: number;
  purchasePrice: number;
  remainingQuantity: number;
  triggeredRules: { id: string; targetProfitRate: number; sellRatio: number }[];
}

export interface DashboardSummary {
  totalInvestmentKrw: number;   // 현재 보유 잔량 원금 (remainingQty 기준)
  totalInvestedKrw: number;     // 총 누적 투자원금 (initialQty 기준, 수익률 분모)
  totalValueKrw: number;
  unrealizedProfitKrw: number;
  realizedProfitKrw: number;
  totalProfitKrw: number;
  totalReturnRate: number;
  exchangeRate: number;
  activeLotCount: number;
  holdingStockCount: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lot)
    private readonly lotRepo: Repository<Lot>,
    @InjectRepository(SellHistory)
    private readonly historyRepo: Repository<SellHistory>,
    @InjectRepository(PositionRule)
    private readonly ruleRepo: Repository<PositionRule>,
    private readonly stocksService: StocksService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummary> {
    const exchangeRate = await this.exchangeRatesService.getUsdToKrw();

    const lots = await this.lotRepo.find({
      where: { user: { id: userId } },
      relations: ['stock'],
    });

    const activeLots = lots.filter(
      (l) => parseFloat(l.remainingQuantity as any) > 0,
    );

    // 현재가 조회 (보유 Lot만)
    const priceTargets = activeLots.map((l) => ({
      symbol: l.stock.symbol,
      market: l.stock.market,
    }));
    const priceMap = await this.stocksService.getMultiplePrices(priceTargets);

    // 현재 보유 잔량 기준 투자원금 & 평가금액
    let totalInvestmentKrw = 0;
    let totalValueKrw = 0;

    for (const lot of activeLots) {
      const remaining = parseFloat(lot.remainingQuantity as any);
      const purchasePrice = parseFloat(lot.purchasePrice as any);
      const priceData = priceMap.get(lot.stock.symbol);
      const currentPrice = priceData?.price ?? purchasePrice;

      // 투자원금: 매수 시점 환율 우선, 없으면 현재 환율 폴백
      const purchaseRate =
        lot.stock.currency === Currency.USD
          ? (lot.exchangeRateAtPurchase
              ? parseFloat(lot.exchangeRateAtPurchase as any)
              : exchangeRate)
          : 1;
      // 평가금액: 현재 시세이므로 현재 환율 사용
      const currentRate = lot.stock.currency === Currency.USD ? exchangeRate : 1;

      totalInvestmentKrw += purchasePrice * remaining * purchaseRate;
      totalValueKrw += currentPrice * remaining * currentRate;
    }

    const unrealizedProfitKrw = totalValueKrw - totalInvestmentKrw;

    // 총 누적 투자원금: 전체 Lot의 initialQuantity 기준 (수익률 분모)
    // USD 종목은 매수 시점 환율(exchangeRateAtPurchase)을 우선 사용 — 현재 환율로 분모가 왜곡되는 문제 방지
    // 기존 Lot에 exchangeRateAtPurchase가 없는 경우에만 현재 환율로 폴백
    let totalInvestedKrw = 0;
    for (const lot of lots) {
      const initial = parseFloat(lot.initialQuantity as any);
      const purchasePrice = parseFloat(lot.purchasePrice as any);
      const rate =
        lot.stock.currency === Currency.USD
          ? (lot.exchangeRateAtPurchase
              ? parseFloat(lot.exchangeRateAtPurchase as any)
              : exchangeRate)
          : 1;
      totalInvestedKrw += purchasePrice * initial * rate;
    }

    // 실현 수익 (매도 시점 환율 사용)
    const histories = await this.historyRepo
      .createQueryBuilder('sh')
      .innerJoinAndSelect('sh.lot', 'l')
      .innerJoinAndSelect('l.stock', 'stock')
      .innerJoin('l.user', 'user')
      .where('user.id = :userId', { userId })
      .getMany();

    let realizedProfitKrw = 0;
    for (const h of histories) {
      const profit = parseFloat(h.realizedProfit as any);
      const isUsd = h.lot.stock.currency === Currency.USD;
      const rate = isUsd
        ? (h.exchangeRateAtSell ? parseFloat(h.exchangeRateAtSell as any) : exchangeRate)
        : 1;
      realizedProfitKrw += profit * rate;
    }

    const totalProfitKrw = unrealizedProfitKrw + realizedProfitKrw;
    // 분모: 전량 매도 후에도 수익률이 사라지지 않도록 totalInvestedKrw 사용
    const totalReturnRate =
      totalInvestedKrw > 0 ? (totalProfitKrw / totalInvestedKrw) * 100 : 0;

    // 보유 카운트
    const activeLotCount = activeLots.length;
    const holdingStockCount = new Set(
      activeLots.map((l) => `${l.stock.market}:${l.stock.symbol}`),
    ).size;

    return {
      totalInvestmentKrw: Math.round(totalInvestmentKrw),
      totalInvestedKrw: Math.round(totalInvestedKrw),
      totalValueKrw: Math.round(totalValueKrw),
      unrealizedProfitKrw: Math.round(unrealizedProfitKrw),
      realizedProfitKrw: Math.round(realizedProfitKrw),
      totalProfitKrw: Math.round(totalProfitKrw),
      totalReturnRate: parseFloat(totalReturnRate.toFixed(2)),
      exchangeRate,
      activeLotCount,
      holdingStockCount,
    };
  }

  async getMonthlySummary(
    userId: string,
    year: number,
  ): Promise<Record<string, { realizedProfit: number; sellCount: number }>> {
    const exchangeRate = await this.exchangeRatesService.getUsdToKrw();

    const histories = await this.historyRepo
      .createQueryBuilder('sh')
      .innerJoinAndSelect('sh.lot', 'l')
      .innerJoinAndSelect('l.stock', 'stock')
      .innerJoin('l.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('EXTRACT(YEAR FROM sh.sell_date) = :year', { year })
      .getMany();

    const monthly: Record<string, { realizedProfit: number; sellCount: number }> = {};

    for (const h of histories) {
      const month = h.sellDate.substring(0, 7);
      const profit = parseFloat(h.realizedProfit as any);
      const isUsd = h.lot.stock.currency === Currency.USD;
      const rate = isUsd
        ? (h.exchangeRateAtSell ? parseFloat(h.exchangeRateAtSell as any) : exchangeRate)
        : 1;

      if (!monthly[month]) monthly[month] = { realizedProfit: 0, sellCount: 0 };
      monthly[month].realizedProfit += profit * rate;
      monthly[month].sellCount += 1;
    }

    return monthly;
  }

  async getActionableLots(userId: string): Promise<ActionableLotDto[]> {
    // 잔여 수량이 있는 Lot + 미실행 PositionRule 함께 조회
    const lots = await this.lotRepo
      .createQueryBuilder('lot')
      .innerJoinAndSelect('lot.stock', 'stock')
      .innerJoin('lot.user', 'user')
      .leftJoinAndSelect('lot.positionRules', 'pr', 'pr.is_executed = false')
      .where('user.id = :userId', { userId })
      .andWhere('lot.remaining_quantity > 0')
      .andWhere('lot.deleted_at IS NULL')
      .getMany();

    // PositionRule이 없는 Lot은 알림 대상 아님
    const lotsWithRules = lots.filter((l) => l.positionRules?.length > 0);
    if (lotsWithRules.length === 0) return [];

    const priceMap = await this.stocksService.getMultiplePrices(
      lotsWithRules.map((l) => ({ symbol: l.stock.symbol, market: l.stock.market })),
    );

    const result: ActionableLotDto[] = [];

    for (const lot of lotsWithRules) {
      const priceData = priceMap.get(lot.stock.symbol);
      if (!priceData) continue;

      const purchasePrice = parseFloat(lot.purchasePrice as any);
      const currentPrice = priceData.price;
      const returnRate = ((currentPrice - purchasePrice) / purchasePrice) * 100;

      // 현재 수익률에 도달한 미실행 규칙만 필터
      const triggeredRules = lot.positionRules
        .filter((r) => !r.isExecuted && returnRate >= parseFloat(r.targetProfitRate as any))
        .map((r) => ({
          id: r.id,
          targetProfitRate: parseFloat(r.targetProfitRate as any),
          sellRatio: parseFloat(r.sellRatio as any),
        }));

      if (triggeredRules.length === 0) continue;

      result.push({
        lotId: lot.id,
        stockName: lot.stock.name,
        symbol: lot.stock.symbol,
        market: lot.stock.market,
        currency: lot.stock.currency,
        returnRate: parseFloat(returnRate.toFixed(2)),
        currentPrice,
        purchasePrice,
        remainingQuantity: parseFloat(lot.remainingQuantity as any),
        triggeredRules,
      });
    }

    // 수익률 높은 순 정렬
    return result.sort((a, b) => b.returnRate - a.returnRate);
  }
}
