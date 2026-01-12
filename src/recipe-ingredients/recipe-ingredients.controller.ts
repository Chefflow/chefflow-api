import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecipeIngredientsService } from './recipe-ingredients.service';
import { CreateRecipeIngredientDto } from './dto/create-recipe-ingredient.dto';
import { UpdateRecipeIngredientDto } from './dto/update-recipe-ingredient.dto';
import { RecipeIngredientEntity } from './entities/recipe-ingredient.entity';

@Controller('recipes/:recipeId/ingredients')
export class RecipeIngredientsController {
  constructor(
    private readonly recipeIngredientsService: RecipeIngredientsService,
  ) {}

  @Post()
  async add(
    @CurrentUser('id') userId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Body() createRecipeIngredientDto: CreateRecipeIngredientDto,
  ): Promise<RecipeIngredientEntity> {
    const ingredient = await this.recipeIngredientsService.add(
      userId,
      recipeId,
      createRecipeIngredientDto,
    );
    return new RecipeIngredientEntity(ingredient);
  }

  @Patch(':ingredientId')
  async update(
    @CurrentUser('id') userId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Param('ingredientId', ParseIntPipe) ingredientId: number,
    @Body() updateRecipeIngredientDto: UpdateRecipeIngredientDto,
  ): Promise<RecipeIngredientEntity> {
    const ingredient = await this.recipeIngredientsService.update(
      userId,
      recipeId,
      ingredientId,
      updateRecipeIngredientDto,
    );
    return new RecipeIngredientEntity(ingredient);
  }

  @Delete(':ingredientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Param('ingredientId', ParseIntPipe) ingredientId: number,
  ): Promise<void> {
    await this.recipeIngredientsService.delete(userId, recipeId, ingredientId);
  }
}
