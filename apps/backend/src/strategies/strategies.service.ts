import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Strategy } from './strategy.entity';
import { StrategyRule } from './strategy-rule.entity';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Injectable()
export class StrategiesService {
  constructor(
    @InjectRepository(Strategy)
    private readonly strategyRepo: Repository<Strategy>,
    @InjectRepository(StrategyRule)
    private readonly ruleRepo: Repository<StrategyRule>,
  ) {}

  async create(userId: string, dto: CreateStrategyDto): Promise<Strategy> {
    this.validateRules(dto.rules.map((r) => r.sellRatio));

    const strategy = this.strategyRepo.create({
      user: { id: userId },
      name: dto.name,
      description: dto.description ?? null,
      rules: dto.rules.map((r) =>
        this.ruleRepo.create({
          targetProfitRate: r.targetProfitRate,
          sellRatio: r.sellRatio,
          orderIndex: r.orderIndex,
        }),
      ),
    });

    return this.strategyRepo.save(strategy);
  }

  findAll(userId: string): Promise<Strategy[]> {
    return this.strategyRepo.find({
      where: { user: { id: userId } },
      relations: ['rules'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Strategy> {
    const strategy = await this.strategyRepo.findOne({
      where: { id, user: { id: userId } },
      relations: ['rules'],
    });
    if (!strategy) throw new NotFoundException('전략을 찾을 수 없습니다.');
    return strategy;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateStrategyDto,
  ): Promise<Strategy> {
    const strategy = await this.findOne(id, userId);
    if (dto.name) strategy.name = dto.name;
    if (dto.description !== undefined) strategy.description = dto.description ?? null;
    return this.strategyRepo.save(strategy);
  }

  async remove(id: string, userId: string): Promise<void> {
    const strategy = await this.strategyRepo.findOne({
      where: { id, user: { id: userId } },
    });
    if (!strategy) throw new NotFoundException('전략을 찾을 수 없습니다.');
    await this.strategyRepo.softDelete(id);
  }

  private validateRules(sellRatios: number[]): void {
    const total = sellRatios.reduce((sum, r) => sum + r, 0);
    if (total > 100) {
      throw new BadRequestException(
        `매도 비율 합계가 100%를 초과합니다: ${total}%`,
      );
    }
  }
}
