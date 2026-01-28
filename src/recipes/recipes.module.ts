import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipeIngredientsModule } from '../recipe-ingredients/recipe-ingredients.module';
import { RecipeStepsModule } from '../recipe-steps/recipe-steps.module';

@Module({
  imports: [RecipeIngredientsModule, RecipeStepsModule],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
