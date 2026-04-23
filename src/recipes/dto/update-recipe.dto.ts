import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { RecipeStatus } from '@prisma/client';

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(RecipeStatus)
  status?: RecipeStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepTime?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cookTime?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
