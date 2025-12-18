import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from './decorators/get-user.decorator';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeEntity } from './entities/recipe.entity';

@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: number,
    @Body() createRecipeDto: CreateRecipeDto,
  ): Promise<RecipeEntity> {
    const recipe = await this.recipesService.create(userId, createRecipeDto);
    return new RecipeEntity(recipe);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: number): Promise<RecipeEntity[]> {
    const recipes = await this.recipesService.findAll(userId);
    return recipes.map((recipe) => new RecipeEntity(recipe));
  }

  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RecipeEntity> {
    const recipe = await this.recipesService.findOne(userId, id);
    return new RecipeEntity(recipe);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRecipeDto: UpdateRecipeDto,
  ): Promise<RecipeEntity> {
    const recipe = await this.recipesService.update(
      userId,
      id,
      updateRecipeDto,
    );
    return new RecipeEntity(recipe);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.recipesService.delete(userId, id);
  }
}
