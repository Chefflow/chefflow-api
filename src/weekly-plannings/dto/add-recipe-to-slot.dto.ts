import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AddRecipeToSlotDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  recipeId!: number;
}
