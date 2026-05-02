import { IsOptional, IsString } from 'class-validator';

export class UpdateLotDto {
  @IsOptional()
  @IsString()
  memo?: string;
}
