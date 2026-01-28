import { IsString, IsOptional, IsInt, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRecipeIngredientDto } from '../../recipe-ingredients/dto/create-recipe-ingredient.dto';
import { CreateRecipeStepDto } from '../../recipe-steps/dto/create-recipe-step.dto';

export class CreateRecipeDto {
  @IsString()
  title!: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients?: CreateRecipeIngredientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  steps?: CreateRecipeStepDto[];
}
