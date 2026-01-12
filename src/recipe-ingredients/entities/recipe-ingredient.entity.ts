import { Unit } from '@prisma/client';

export class RecipeIngredientEntity {
  id!: number;
  recipeId!: number;
  ingredientName!: string;
  quantity!: number;
  unit!: Unit;
  notes?: string | null;
  order!: number;

  constructor(partial: Partial<RecipeIngredientEntity>) {
    Object.assign(this, partial);
  }
}
