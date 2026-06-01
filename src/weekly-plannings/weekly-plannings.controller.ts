import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { DayOfWeek } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  WeeklyPlanningsService,
  type PlanningWithSlotsFlattened,
} from './weekly-plannings.service';
import { CreateWeeklyPlanningDto } from './dto/create-weekly-planning.dto';
import { UpdateWeeklyPlanningDto } from './dto/update-weekly-planning.dto';
import { AddRecipeToSlotDto } from './dto/add-recipe-to-slot.dto';
import { WeeklyPlanningEntity } from './entities/weekly-planning.entity';
import { WeeklyPlanningSlotEntity } from './entities/weekly-planning-slot.entity';
import { RecipeEntity } from '../recipes/entities/recipe.entity';
import { ParseDayOfWeekPipe } from './pipes/parse-day-of-week.pipe';
import { ParseSlotNumberPipe } from './pipes/parse-slot-number.pipe';

@Controller('weekly-plannings')
@Throttle({ default: { limit: 300, ttl: 60000 } })
export class WeeklyPlanningsController {
  constructor(
    private readonly weeklyPlanningsService: WeeklyPlanningsService,
  ) {}

  private toEntity(planning: PlanningWithSlotsFlattened): WeeklyPlanningEntity {
    const { slots, ...rest } = planning;
    return new WeeklyPlanningEntity({
      ...rest,
      slots: slots.map(
        (s) =>
          new WeeklyPlanningSlotEntity({
            ...s,
            recipes: s.recipes.map((r) => new RecipeEntity(r)),
          }),
      ),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: number,
    @Body() createDto: CreateWeeklyPlanningDto,
  ): Promise<WeeklyPlanningEntity> {
    const planning = await this.weeklyPlanningsService.create(
      userId,
      createDto,
    );
    return this.toEntity(planning);
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
    return this.toEntity(planning);
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
    return this.toEntity(planning);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.weeklyPlanningsService.delete(userId, id);
  }

  @Post(':id/slots/:day/:slot/recipes')
  @HttpCode(HttpStatus.CREATED)
  async addRecipeToSlot(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('day', ParseDayOfWeekPipe) day: DayOfWeek,
    @Param('slot', ParseSlotNumberPipe) slot: number,
    @Body() dto: AddRecipeToSlotDto,
  ): Promise<WeeklyPlanningSlotEntity> {
    const result = await this.weeklyPlanningsService.addRecipeToSlot(
      userId,
      id,
      day,
      slot,
      dto.recipeId,
    );
    return new WeeklyPlanningSlotEntity({
      ...result,
      recipes: result.recipes.map((j) => new RecipeEntity(j.recipe)),
    });
  }

  @Delete(':id/slots/:day/:slot/recipes/:recipeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRecipeFromSlot(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('day', ParseDayOfWeekPipe) day: DayOfWeek,
    @Param('slot', ParseSlotNumberPipe) slot: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
  ): Promise<void> {
    await this.weeklyPlanningsService.removeRecipeFromSlot(
      userId,
      id,
      day,
      slot,
      recipeId,
    );
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
