import { Unit } from '@prisma/client';

export class IngredientEntity {
  id!: number;
  recipeId!: number;
  ingredientName!: string;
  quantity!: number;
  unit!: Unit;
  notes?: string | null;
  order!: number;

  constructor(partial: Partial<IngredientEntity>) {
    Object.assign(this, partial);
  }
}
