import {
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { Unit } from '@prisma/client';

export class CreateIngredientDto {
  @IsInt()
  recipeId!: number;

  @IsString()
  ingredientName!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsEnum(Unit)
  unit!: Unit;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
