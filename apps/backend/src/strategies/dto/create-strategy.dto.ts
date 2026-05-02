import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateStrategyRuleDto {
  @IsNumber()
  @Min(-100)
  @Max(10000)
  targetProfitRate: number;

  @IsNumber()
  @IsPositive()
  @Max(100)
  sellRatio: number;

  @IsNumber()
  @Min(0)
  orderIndex: number;
}

export class CreateStrategyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStrategyRuleDto)
  rules: CreateStrategyRuleDto[];
}
