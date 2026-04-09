import { IsDateString } from 'class-validator';
import { IsMonday } from '../validators/is-monday.validator';

export class CreateWeeklyPlanningDto {
  @IsDateString()
  @IsMonday()
  weekStart!: string;
}
