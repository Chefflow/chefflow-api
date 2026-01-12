import { PartialType } from '@nestjs/mapped-types';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';

export class UpdateRecipeIngredientDto extends PartialType(CreateRecipeIngredientDto) {}
