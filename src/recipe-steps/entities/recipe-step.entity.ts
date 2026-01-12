export class RecipeStepEntity {
  id!: number;
  recipeId!: number;
  stepNumber!: number;
  instruction!: string;
  duration?: number | null;

  constructor(partial: Partial<RecipeStepEntity>) {
    Object.assign(this, partial);
  }
}
