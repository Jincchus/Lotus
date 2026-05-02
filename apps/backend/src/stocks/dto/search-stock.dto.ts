import { IsEnum, IsString, MinLength } from 'class-validator';
import { Market } from '../stock.entity';

export class SearchStockDto {
  @IsString()
  @MinLength(1)
  query: string;

  @IsEnum(Market)
  market: Market;
}
