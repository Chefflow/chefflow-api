import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeIngredientsService } from '../recipe-ingredients/recipe-ingredients.service';
import { RecipeStepsService } from '../recipe-steps/recipe-steps.service';

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingredientsService: RecipeIngredientsService,
    private readonly stepsService: RecipeStepsService,
  ) {}

  async create(userId: number, recipeDto: CreateRecipeDto) {
    return await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          userId,
          title: recipeDto.title,
          description: recipeDto.description,
          servings: recipeDto.servings ?? 1,
          prepTime: recipeDto.prepTime,
          cookTime: recipeDto.cookTime,
          imageUrl: recipeDto.imageUrl,
        },
      });

      if (recipeDto.ingredients && recipeDto.ingredients.length > 0) {
        for (const ingredientDto of recipeDto.ingredients) {
          await this.ingredientsService.add(
            userId,
            recipe.id,
            ingredientDto,
            tx,
          );
        }
      }

      if (recipeDto.steps && recipeDto.steps.length > 0) {
        for (const stepDto of recipeDto.steps) {
          await this.stepsService.create(userId, recipe.id, stepDto, tx);
        }
      }

      return await tx.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          ingredients: {
            orderBy: { order: 'asc' },
          },
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
        },
      });
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
