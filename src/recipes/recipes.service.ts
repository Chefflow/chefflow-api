import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, recipe: CreateRecipeDto) {
    return await this.prisma.recipe.create({
      data: {
        userId,
        ...recipe,
        servings: recipe.servings ?? 1,
      },
    });
  }

  async findAll(userId: number) {
    return await this.prisma.recipe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: number, recipeId: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        ingredients: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    if (recipe.userId !== userId) {
      throw new ForbiddenException('You do not have access to this recipe');
    }

    return recipe;
  }

  async update(userId: number, recipeId: number, newRecipe: UpdateRecipeDto) {
    await this.findOne(userId, recipeId);

    return await this.prisma.recipe.update({
      where: { id: recipeId },
      data: newRecipe,
    });
  }

  async delete(userId: number, recipeId: number) {
    await this.findOne(userId, recipeId);

    await this.prisma.recipe.delete({
      where: { id: recipeId },
    });
  }
}
