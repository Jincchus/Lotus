import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExchangeRatesService } from './exchange-rates.service';

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get('current')
  async getCurrent() {
    const { rate, fetchedAt } = await this.exchangeRatesService.getCurrentRate();
    return { usdToKrw: rate, fetchedAt };
  }
}
