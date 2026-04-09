import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import { RecipeEntity } from '../../recipes/entities/recipe.entity';

export class WeeklyPlanningSlotEntity {
  id!: number;
  weeklyPlanningId!: number;
  dayOfWeek!: DayOfWeek;
  slotNumber!: number;
  recipeId!: number;

  @Type(() => RecipeEntity)
  recipe?: RecipeEntity;

  constructor(partial: Partial<WeeklyPlanningSlotEntity>) {
    Object.assign(this, partial);
  }
}
