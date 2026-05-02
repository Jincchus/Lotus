import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Market } from '../../stocks/stock.entity';

export class CreateWatchlistDto {
  @IsString()
  @MinLength(1)
  symbol: string;

  @IsEnum(Market)
  market: Market;

  @IsString()
  @MinLength(1)
  stockName: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
