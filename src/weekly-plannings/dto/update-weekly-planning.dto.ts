import { PartialType } from '@nestjs/mapped-types';
import { CreateWeeklyPlanningDto } from './create-weekly-planning.dto';

export class UpdateWeeklyPlanningDto extends PartialType(CreateWeeklyPlanningDto) {}
