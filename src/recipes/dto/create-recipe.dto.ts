import { IsString, IsOptional, IsInt, Min } from 'class-validator';

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
}
