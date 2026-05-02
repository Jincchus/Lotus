import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionRule } from './position-rule.entity';
import { PositionRulesService } from './position-rules.service';
import { PositionRulesController } from './position-rules.controller';
import { LotsModule } from '../lots/lots.module';
import { StrategiesModule } from '../strategies/strategies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PositionRule]),
    LotsModule,
    StrategiesModule,
  ],
  providers: [PositionRulesService],
  controllers: [PositionRulesController],
  exports: [PositionRulesService],
})
export class PositionRulesModule {}
