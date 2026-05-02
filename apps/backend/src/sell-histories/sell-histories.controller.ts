import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { SellHistoriesService } from './sell-histories.service';
import { ExecuteSellDto } from './dto/execute-sell.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class SellHistoriesController {
  constructor(private readonly service: SellHistoriesService) {}

  @Post('lots/:lotId/sell')
  execute(
    @Param('lotId') lotId: string,
    @CurrentUser() user: User,
    @Body() dto: ExecuteSellDto,
  ) {
    return this.service.execute(lotId, user.id, dto);
  }

  @Get('lots/:lotId/sell-histories')
  findByLot(@Param('lotId') lotId: string, @CurrentUser() user: User) {
    return this.service.findByLot(lotId, user.id);
  }

  @Get('sell-histories/monthly-stats')
  getMonthlyStats(
    @CurrentUser() user: User,
    @Query('year') year?: string,
  ) {
    return this.service.getMonthlyStats(user.id, year ? parseInt(year) : undefined);
  }

  @Get('sell-histories')
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id);
  }
}
