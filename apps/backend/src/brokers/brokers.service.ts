import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker } from './broker.entity';

@Injectable()
export class BrokersService {
  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
  ) {}

  findAll(): Promise<Broker[]> {
    return this.brokerRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
