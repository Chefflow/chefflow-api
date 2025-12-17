import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() createIngredientDto: CreateIngredientDto) {
    return `Ingredinet ${CreateIngredientDto.name} was created`;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async find(@Param('search') ingredient: string) {
    return `Ingredient ${ingredient} return`;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return `Ingredient with ${id} return`;
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateIngredient: UpdateIngredientDto,
  ) {
    return `For the ${id} updated to ${updateIngredient}`;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param(':id') id: string) {
    return `delete ingredient with the id: ${id}`;
  }
}
