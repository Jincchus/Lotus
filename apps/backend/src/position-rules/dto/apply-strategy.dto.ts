import { IsUUID } from 'class-validator';

export class ApplyStrategyDto {
  @IsUUID()
  strategyId: string;
}
