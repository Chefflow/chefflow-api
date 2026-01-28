import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeStepDto } from './dto/create-recipe-step.dto';
import { UpdateRecipeStepDto } from './dto/update-recipe-step.dto';
import type { Prisma } from '@prisma/client';

type PrismaTransaction = Prisma.TransactionClient;

@Injectable()
export class RecipeStepsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    recipeId: number,
    dto: CreateRecipeStepDto,
    tx?: PrismaTransaction,
  ) {
    const prisma = tx ?? this.prisma;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException('You do not have access to this recipe');
    }

    const lastStep = await prisma.recipeStep.findFirst({
      where: { recipeId },
      orderBy: { stepNumber: 'desc' },
    });

    const stepNumber = (lastStep?.stepNumber ?? 0) + 1;

    return await prisma.recipeStep.create({
      data: {
        recipeId,
        stepNumber,
        ...dto,
      },
    });
  }

  async update(
    userId: number,
    recipeId: number,
    stepId: number,
    dto: UpdateRecipeStepDto,
    tx?: PrismaTransaction,
  ) {
    const prisma = tx ?? this.prisma;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException('You do not have access to this recipe');
    }

    const step = await prisma.recipeStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    if (step.recipeId !== recipeId) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    return await prisma.recipeStep.update({
      where: { id: stepId },
      data: dto,
    });
  }

  async delete(
    userId: number,
    recipeId: number,
    stepId: number,
    tx?: PrismaTransaction,
  ) {
    const prisma = tx ?? this.prisma;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException('You do not have access to this recipe');
    }

    const step = await prisma.recipeStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    if (step.recipeId !== recipeId) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    await prisma.recipeStep.delete({
      where: { id: stepId },
    });
  }
}
