import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, MaxLength } from 'class-validator';
import { Unit } from '@prisma/client';

export class CreateRecipeIngredientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ingredientName!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsEnum(Unit)
  unit!: Unit;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;
}
