import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrokersService } from './brokers.service';

@Controller('brokers')
@UseGuards(JwtAuthGuard)
export class BrokersController {
  constructor(private readonly brokersService: BrokersService) {}

  @Get()
  findAll() {
    return this.brokersService.findAll();
  }
}
