import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSlotDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  recipeId!: number;
}
