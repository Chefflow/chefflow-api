import { Type } from 'class-transformer';
import { WeeklyPlanningSlotEntity } from './weekly-planning-slot.entity';

export class WeeklyPlanningEntity {
  id!: number;
  userId!: number;
  weekStart!: Date;
  weekEnd!: Date;
  createdAt!: Date;
  updatedAt!: Date;

  @Type(() => WeeklyPlanningSlotEntity)
  slots?: WeeklyPlanningSlotEntity[];

  constructor(partial: Partial<WeeklyPlanningEntity>) {
    Object.assign(this, partial);
  }
}
