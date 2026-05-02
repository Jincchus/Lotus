import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionRule } from './position-rule.entity';
import { LotsService } from '../lots/lots.service';
import { StrategiesService } from '../strategies/strategies.service';

@Injectable()
export class PositionRulesService {
  constructor(
    @InjectRepository(PositionRule)
    private readonly ruleRepo: Repository<PositionRule>,
    private readonly lotsService: LotsService,
    private readonly strategiesService: StrategiesService,
  ) {}

  /**
   * Strategy → PositionRule 복사 저장 (P2 원칙: PositionRule 불변성)
   * 기존 미실행 PositionRule이 있으면 교체 전 경고
   */
  async applyStrategy(
    lotId: string,
    strategyId: string,
    userId: string,
  ): Promise<PositionRule[]> {
    await this.lotsService.assertOwner(lotId, userId);
    const strategy = await this.strategiesService.findOne(strategyId, userId);

    const hasExecuted = await this.ruleRepo.exists({
      where: { lot: { id: lotId }, isExecuted: true },
    });
    if (hasExecuted) {
      throw new BadRequestException(
        '이미 실행된 PositionRule이 있습니다. 기존 전략 실행 내역을 확인하세요.',
      );
    }

    // 미실행 기존 규칙 제거 후 새 규칙 복사
    await this.ruleRepo.delete({ lot: { id: lotId }, isExecuted: false });

    const newRules = strategy.rules.map((rule) =>
      this.ruleRepo.create({
        lot: { id: lotId },
        sourceStrategy: { id: strategyId },
        targetProfitRate: rule.targetProfitRate,
        sellRatio: rule.sellRatio,
        orderIndex: rule.orderIndex,
      }),
    );

    return this.ruleRepo.save(newRules);
  }

  findByLot(lotId: string, userId: string): Promise<PositionRule[]> {
    return this.ruleRepo
      .createQueryBuilder('pr')
      .innerJoin('pr.lot', 'lot')
      .innerJoin('lot.user', 'user')
      .where('lot.id = :lotId AND user.id = :userId', { lotId, userId })
      .orderBy('pr.orderIndex', 'ASC')
      .getMany();
  }

  async removeAll(lotId: string, userId: string): Promise<void> {
    await this.lotsService.assertOwner(lotId, userId);

    const hasExecuted = await this.ruleRepo.exists({
      where: { lot: { id: lotId }, isExecuted: true },
    });
    if (hasExecuted) {
      throw new BadRequestException(
        '이미 실행된 PositionRule이 포함되어 있어 전체 삭제할 수 없습니다.',
      );
    }

    await this.ruleRepo.delete({ lot: { id: lotId } });
  }

  async findOneOrFail(id: string, lotId: string): Promise<PositionRule> {
    const rule = await this.ruleRepo.findOne({
      where: { id, lot: { id: lotId } },
    });
    if (!rule) throw new NotFoundException('PositionRule을 찾을 수 없습니다.');
    return rule;
  }

  async markExecuted(id: string): Promise<void> {
    await this.ruleRepo.update(id, {
      isExecuted: true,
      executedAt: new Date(),
    });
  }
}
