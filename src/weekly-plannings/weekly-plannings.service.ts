import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  DayOfWeek,
  Prisma,
  Recipe,
  WeeklyPlanning,
  WeeklyPlanningSlot,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeeklyPlanningDto } from './dto/create-weekly-planning.dto';
import { UpdateWeeklyPlanningDto } from './dto/update-weekly-planning.dto';

const MAX_RECIPES_PER_SLOT = 5;

type SlotWithJunction = WeeklyPlanningSlot & {
  recipes: Array<{ recipe: Recipe }>;
};

type PlanningWithSlotsRaw = WeeklyPlanning & {
  slots: SlotWithJunction[];
};

export type PlanningSlotFlattened = WeeklyPlanningSlot & {
  recipes: Recipe[];
};

export type PlanningWithSlotsFlattened = WeeklyPlanning & {
  slots: PlanningSlotFlattened[];
};

@Injectable()
export class WeeklyPlanningsService {
  constructor(private readonly prisma: PrismaService) {}

  private computeWeekEnd(weekStart: Date): Date {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    return weekEnd;
  }

  private async findPlanningOrThrow(userId: number, id: number) {
    const planning = await this.prisma.weeklyPlanning.findUnique({
      where: { id },
    });

    if (!planning || planning.userId !== userId) {
      throw new NotFoundException(`Weekly planning with ID ${id} not found`);
    }

    return planning;
  }

  private readonly slotsInclude = {
    slots: {
      include: {
        recipes: {
          orderBy: { position: 'asc' as const },
          include: { recipe: true },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' as const }, { slotNumber: 'asc' as const }],
    },
  } satisfies Prisma.WeeklyPlanningInclude;

  private flattenSlots(
    planning: PlanningWithSlotsRaw,
  ): PlanningWithSlotsFlattened {
    return {
      ...planning,
      slots: planning.slots.map((s) => {
        const { recipes, ...rest } = s;
        return {
          ...rest,
          recipes: recipes.map((j) => j.recipe),
        };
      }),
    };
  }

  async create(userId: number, dto: CreateWeeklyPlanningDto) {
    const weekStart = new Date(dto.weekStart);
    const weekEnd = this.computeWeekEnd(weekStart);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { slotsPerDay: true },
    });

    try {
      const planning = await this.prisma.weeklyPlanning.create({
        data: {
          userId,
          weekStart,
          weekEnd,
          slotsPerDay: user.slotsPerDay,
        },
        include: this.slotsInclude,
      });
      return this.flattenSlots(planning);
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'A weekly planning for this week already exists',
        );
      }
      throw error;
    }
  }

  async findAll(userId: number) {
    return this.prisma.weeklyPlanning.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const planning = await this.prisma.weeklyPlanning.findUnique({
      where: { id },
      include: this.slotsInclude,
    });

    if (!planning || planning.userId !== userId) {
      throw new NotFoundException(`Weekly planning with ID ${id} not found`);
    }

    return this.flattenSlots(planning);
  }

  async update(userId: number, id: number, dto: UpdateWeeklyPlanningDto) {
    await this.findPlanningOrThrow(userId, id);

    const data: { weekStart?: Date; weekEnd?: Date } = {};
    if (dto.weekStart) {
      data.weekStart = new Date(dto.weekStart);
      data.weekEnd = this.computeWeekEnd(data.weekStart);
    }

    try {
      const planning = await this.prisma.weeklyPlanning.update({
        where: { id },
        data,
        include: this.slotsInclude,
      });
      return this.flattenSlots(planning);
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'A weekly planning for this week already exists',
        );
      }
      throw error;
    }
  }

  async delete(userId: number, id: number): Promise<void> {
    await this.findPlanningOrThrow(userId, id);
    await this.prisma.weeklyPlanning.delete({ where: { id } });
  }

  async addRecipeToSlot(
    userId: number,
    planningId: number,
    dayOfWeek: DayOfWeek,
    slotNumber: number,
    recipeId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const planning = await tx.weeklyPlanning.findUnique({
        where: { id: planningId },
        select: { id: true, userId: true, slotsPerDay: true },
      });

      if (!planning || planning.userId !== userId) {
        throw new NotFoundException(
          `Weekly planning with ID ${planningId} not found`,
        );
      }

      if (slotNumber > planning.slotsPerDay) {
        throw new BadRequestException({
          code: 'SLOT_OUT_OF_RANGE',
          message: `Slot number ${slotNumber} exceeds planning's slotsPerDay (${planning.slotsPerDay})`,
        });
      }

      const recipe = await tx.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true, userId: true },
      });

      if (!recipe || recipe.userId !== userId) {
        throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
      }

      const slot = await tx.weeklyPlanningSlot.upsert({
        where: {
          weeklyPlanningId_dayOfWeek_slotNumber: {
            weeklyPlanningId: planningId,
            dayOfWeek,
            slotNumber,
          },
        },
        create: {
          weeklyPlanningId: planningId,
          dayOfWeek,
          slotNumber,
        },
        update: {},
        include: { recipes: true },
      });

      if (slot.recipes.length >= MAX_RECIPES_PER_SLOT) {
        throw new BadRequestException({
          code: 'SLOT_FULL',
          message: `Slot already contains the maximum of ${MAX_RECIPES_PER_SLOT} recipes`,
        });
      }

      if (slot.recipes.some((r) => r.recipeId === recipeId)) {
        throw new ConflictException({
          code: 'RECIPE_DUPLICATE',
          message: 'Recipe is already assigned to this slot',
        });
      }

      const nextPosition =
        slot.recipes.length === 0
          ? 1
          : Math.max(...slot.recipes.map((r) => r.position)) + 1;

      try {
        await tx.weeklyPlanningSlotRecipe.create({
          data: {
            slotId: slot.id,
            recipeId,
            position: nextPosition,
          },
        });
      } catch (error: unknown) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new ConflictException({
            code: 'RECIPE_DUPLICATE',
            message: 'Recipe is already assigned to this slot',
          });
        }
        throw error;
      }

      return tx.weeklyPlanningSlot.findUniqueOrThrow({
        where: { id: slot.id },
        include: {
          recipes: {
            orderBy: { position: 'asc' },
            include: { recipe: true },
          },
        },
      });
    });
  }

  async removeRecipeFromSlot(
    userId: number,
    planningId: number,
    dayOfWeek: DayOfWeek,
    slotNumber: number,
    recipeId: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const planning = await tx.weeklyPlanning.findUnique({
        where: { id: planningId },
        select: { id: true, userId: true },
      });

      if (!planning || planning.userId !== userId) {
        throw new NotFoundException(
          `Weekly planning with ID ${planningId} not found`,
        );
      }

      const slot = await tx.weeklyPlanningSlot.findUnique({
        where: {
          weeklyPlanningId_dayOfWeek_slotNumber: {
            weeklyPlanningId: planningId,
            dayOfWeek,
            slotNumber,
          },
        },
        select: { id: true },
      });

      if (!slot) {
        throw new NotFoundException(
          `Slot ${slotNumber} for ${dayOfWeek} in planning ${planningId} not found`,
        );
      }

      const result = await tx.weeklyPlanningSlotRecipe.deleteMany({
        where: { slotId: slot.id, recipeId },
      });

      if (result.count === 0) {
        throw new NotFoundException(
          `Recipe ${recipeId} is not assigned to slot ${slotNumber} on ${dayOfWeek}`,
        );
      }
    });
  }

  async deleteSlot(
    userId: number,
    planningId: number,
    dayOfWeek: DayOfWeek,
    slotNumber: number,
  ): Promise<void> {
    await this.findPlanningOrThrow(userId, planningId);

    const slot = await this.prisma.weeklyPlanningSlot.findUnique({
      where: {
        weeklyPlanningId_dayOfWeek_slotNumber: {
          weeklyPlanningId: planningId,
          dayOfWeek,
          slotNumber,
        },
      },
    });

    if (!slot) {
      throw new NotFoundException(
        `Slot ${slotNumber} for ${dayOfWeek} in planning ${planningId} not found`,
      );
    }

    await this.prisma.weeklyPlanningSlot.delete({
      where: {
        weeklyPlanningId_dayOfWeek_slotNumber: {
          weeklyPlanningId: planningId,
          dayOfWeek,
          slotNumber,
        },
      },
    });
  }
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}
