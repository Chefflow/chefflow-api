import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeIngredientDto } from './dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDto } from './dto/update-recipe-ingredient.dto';
import type { Prisma } from '@prisma/client';

type PrismaTransaction = Prisma.TransactionClient;

@Injectable()
export class RecipeIngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    userId: number,
    recipeId: number,
    dto: CreateRecipeIngredientDto,
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

    let order = dto.order;
    if (order === undefined) {
      const lastIngredient = await prisma.recipeIngredient.findFirst({
        where: { recipeId },
        orderBy: { order: 'desc' },
      });
      order = (lastIngredient?.order ?? -1) + 1;
    }

    const { order: _, ...dtoWithoutOrder } = dto;

    return await prisma.recipeIngredient.create({
      data: {
        recipeId,
        order,
        ...dtoWithoutOrder,
      },
    });
  }

  async update(
    userId: number,
    recipeId: number,
    ingredientId: number,
    dto: UpdateRecipeIngredientDto,
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

    const ingredient = await prisma.recipeIngredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    if (ingredient.recipeId !== recipeId) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    return await prisma.recipeIngredient.update({
      where: { id: ingredientId },
      data: dto,
    });
  }

  async delete(
    userId: number,
    recipeId: number,
    ingredientId: number,
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

    const ingredient = await prisma.recipeIngredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    if (ingredient.recipeId !== recipeId) {
      throw new NotFoundException(
        `Ingredient with ID ${ingredientId} not found`,
      );
    }

    await prisma.recipeIngredient.delete({
      where: { id: ingredientId },
    });
  }
}
