import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WeeklyPlanningsService } from './weekly-plannings.service';
import { CreateWeeklyPlanningDto } from './dto/create-weekly-planning.dto';
import { UpdateWeeklyPlanningDto } from './dto/update-weekly-planning.dto';
import { UpsertSlotDto } from './dto/upsert-slot.dto';
import { WeeklyPlanningEntity } from './entities/weekly-planning.entity';
import { WeeklyPlanningSlotEntity } from './entities/weekly-planning-slot.entity';
import { ParseDayOfWeekPipe } from './pipes/parse-day-of-week.pipe';
import { ParseSlotNumberPipe } from './pipes/parse-slot-number.pipe';

@Controller('weekly-plannings')
export class WeeklyPlanningsController {
  constructor(
    private readonly weeklyPlanningsService: WeeklyPlanningsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: number,
    @Body() createDto: CreateWeeklyPlanningDto,
  ): Promise<WeeklyPlanningEntity> {
    const planning = await this.weeklyPlanningsService.create(userId, createDto);
    return new WeeklyPlanningEntity(planning);
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: number,
  ): Promise<WeeklyPlanningEntity[]> {
    const plannings = await this.weeklyPlanningsService.findAll(userId);
    return plannings.map((p) => new WeeklyPlanningEntity(p));
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WeeklyPlanningEntity> {
    const planning = await this.weeklyPlanningsService.findOne(userId, id);
    return new WeeklyPlanningEntity(planning);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWeeklyPlanningDto,
  ): Promise<WeeklyPlanningEntity> {
    const planning = await this.weeklyPlanningsService.update(
      userId,
      id,
      updateDto,
    );
    return new WeeklyPlanningEntity(planning);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.weeklyPlanningsService.delete(userId, id);
  }

  @Put(':id/slots/:day/:slot')
  async upsertSlot(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('day', ParseDayOfWeekPipe) day: DayOfWeek,
    @Param('slot', ParseSlotNumberPipe) slot: number,
    @Body() upsertSlotDto: UpsertSlotDto,
  ): Promise<WeeklyPlanningSlotEntity> {
    const result = await this.weeklyPlanningsService.upsertSlot(
      userId,
      id,
      day,
      slot,
      upsertSlotDto,
    );
    return new WeeklyPlanningSlotEntity(result);
  }

  @Delete(':id/slots/:day/:slot')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSlot(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('day', ParseDayOfWeekPipe) day: DayOfWeek,
    @Param('slot', ParseSlotNumberPipe) slot: number,
  ): Promise<void> {
    await this.weeklyPlanningsService.deleteSlot(userId, id, day, slot);
  }
}
