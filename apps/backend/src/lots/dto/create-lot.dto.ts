import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Market } from '../../stocks/stock.entity';

export class CreateLotDto {
  @IsString()
  @MinLength(1)
  symbol: string;

  @IsEnum(Market)
  market: Market;

  @IsUUID()
  brokerId: string;

  @IsNumber()
  @IsPositive()
  purchasePrice: number;

  @IsDateString()
  purchaseDate: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  exchangeRateAtPurchase?: number;

  @IsOptional()
  @IsString()
  memo?: string;
}
