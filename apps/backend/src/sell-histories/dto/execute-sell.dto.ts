import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { SellType } from '../sell-history.entity';

export class ExecuteSellDto {
  @IsNumber()
  @IsPositive()
  sellPrice: number;

  @IsNumber()
  @IsPositive()
  sellQuantity: number;

  @IsDateString()
  sellDate: string;

  @IsEnum(SellType)
  sellType: SellType;

  @IsOptional()
  @IsUUID()
  positionRuleId?: string;
}
