import { Type } from 'class-transformer';
import { DayOfWeek } from '@prisma/client';
import { RecipeEntity } from '../../recipes/entities/recipe.entity';

export class WeeklyPlanningSlotEntity {
  id!: number;
  weeklyPlanningId!: number;
  dayOfWeek!: DayOfWeek;
  slotNumber!: number;
  createdAt!: Date;
  updatedAt!: Date;

  @Type(() => RecipeEntity)
  recipes!: RecipeEntity[];

  constructor(partial: Partial<WeeklyPlanningSlotEntity>) {
    Object.assign(this, partial);
  }
}
