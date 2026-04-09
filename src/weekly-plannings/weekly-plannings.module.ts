import { Module } from '@nestjs/common';
import { WeeklyPlanningsController } from './weekly-plannings.controller';
import { WeeklyPlanningsService } from './weekly-plannings.service';

@Module({
  controllers: [WeeklyPlanningsController],
  providers: [WeeklyPlanningsService],
})
export class WeeklyPlanningsModule {}
