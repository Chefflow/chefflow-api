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

  constructor(partial: Partial<RecipeEntity>) {
    Object.assign(this, partial);
  }
}
