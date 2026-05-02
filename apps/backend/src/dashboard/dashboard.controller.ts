import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: User) {
    return this.dashboardService.getSummary(user.id);
  }

  @Get('monthly')
  getMonthlySummary(
    @CurrentUser() user: User,
    @Query('year') year: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dashboardService.getMonthlySummary(user.id, y);
  }

  @Get('actionable-lots')
  getActionableLots(@CurrentUser() user: User) {
    return this.dashboardService.getActionableLots(user.id);
  }
}
