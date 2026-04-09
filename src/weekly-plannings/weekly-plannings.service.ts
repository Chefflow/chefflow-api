import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeeklyPlanningDto } from './dto/create-weekly-planning.dto';
import { UpdateWeeklyPlanningDto } from './dto/update-weekly-planning.dto';
import { UpsertSlotDto } from './dto/upsert-slot.dto';

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

    if (!planning) {
      throw new NotFoundException(`Weekly planning with ID ${id} not found`);
    }

    if (planning.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this weekly planning',
      );
    }

    return planning;
  }

  private readonly slotsInclude = {
    slots: {
      include: { recipe: true },
      orderBy: [
        { dayOfWeek: 'asc' as const },
        { slotNumber: 'asc' as const },
      ],
    },
  };

  async create(userId: number, dto: CreateWeeklyPlanningDto) {
    const weekStart = new Date(dto.weekStart);
    const weekEnd = this.computeWeekEnd(weekStart);

    try {
      return await this.prisma.weeklyPlanning.create({
        data: { userId, weekStart, weekEnd },
        include: this.slotsInclude,
      });
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

    if (!planning) {
      throw new NotFoundException(`Weekly planning with ID ${id} not found`);
    }

    if (planning.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this weekly planning',
      );
    }

    return planning;
  }

  async update(userId: number, id: number, dto: UpdateWeeklyPlanningDto) {
    await this.findPlanningOrThrow(userId, id);

    const data: { weekStart?: Date; weekEnd?: Date } = {};
    if (dto.weekStart) {
      data.weekStart = new Date(dto.weekStart);
      data.weekEnd = this.computeWeekEnd(data.weekStart);
    }

    try {
      return await this.prisma.weeklyPlanning.update({
        where: { id },
        data,
        include: this.slotsInclude,
      });
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

  async upsertSlot(
    userId: number,
    planningId: number,
    dayOfWeek: DayOfWeek,
    slotNumber: number,
    dto: UpsertSlotDto,
  ) {
    await this.findPlanningOrThrow(userId, planningId);

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: dto.recipeId },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${dto.recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException('You do not have access to this recipe');
    }

    return this.prisma.weeklyPlanningSlot.upsert({
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
        recipeId: dto.recipeId,
      },
      update: {
        recipeId: dto.recipeId,
      },
      include: { recipe: true },
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
