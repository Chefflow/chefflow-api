import { RecipeStepEntity } from '../../recipe-steps/entities/recipe-step.entity';
import { RecipeIngredientEntity } from '../../recipe-ingredients/entities/recipe-ingredient.entity';

export class RecipeEntity {
  id!: number;
  userId!: number;
  title!: string;
  description?: string | null;
  servings!: number;
  prepTime?: number | null;
  cookTime?: number | null;
  imageUrl?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  steps?: RecipeStepEntity[];
  ingredients?: RecipeIngredientEntity[];

  constructor(partial: Partial<RecipeEntity>) {
    Object.assign(this, partial);
  }
}
