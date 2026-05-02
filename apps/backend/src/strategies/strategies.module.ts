import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strategy } from './strategy.entity';
import { StrategyRule } from './strategy-rule.entity';
import { StrategiesService } from './strategies.service';
import { StrategiesController } from './strategies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Strategy, StrategyRule])],
  providers: [StrategiesService],
  controllers: [StrategiesController],
  exports: [StrategiesService],
})
export class StrategiesModule {}
