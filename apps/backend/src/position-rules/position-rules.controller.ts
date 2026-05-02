import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { PositionRulesService } from './position-rules.service';
import { ApplyStrategyDto } from './dto/apply-strategy.dto';

@Controller('lots/:lotId/position-rules')
@UseGuards(JwtAuthGuard)
export class PositionRulesController {
  constructor(private readonly service: PositionRulesService) {}

  @Post('apply')
  applyStrategy(
    @Param('lotId') lotId: string,
    @CurrentUser() user: User,
    @Body() dto: ApplyStrategyDto,
  ) {
    return this.service.applyStrategy(lotId, dto.strategyId, user.id);
  }

  @Get()
  findAll(@Param('lotId') lotId: string, @CurrentUser() user: User) {
    return this.service.findByLot(lotId, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAll(@Param('lotId') lotId: string, @CurrentUser() user: User) {
    return this.service.removeAll(lotId, user.id);
  }
}
