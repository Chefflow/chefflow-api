import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RecipeStepsService } from './recipe-steps.service';
import { CreateRecipeStepDto } from './dto/create-recipe-step.dto';
import { UpdateRecipeStepDto } from './dto/update-recipe-step.dto';
import { RecipeStepEntity } from './entities/recipe-step.entity';

@Controller('recipes/:recipeId/steps')
export class RecipeStepsController {
  constructor(private readonly recipeStepsService: RecipeStepsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Body() createRecipeStepDto: CreateRecipeStepDto,
  ): Promise<RecipeStepEntity> {
    const step = await this.recipeStepsService.create(
      userId,
      recipeId,
      createRecipeStepDto,
    );
    return new RecipeStepEntity(step);
  }

  @Patch(':stepId')
  async update(
    @CurrentUser('id') userId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Param('stepId', ParseIntPipe) stepId: number,
    @Body() updateRecipeStepDto: UpdateRecipeStepDto,
  ): Promise<RecipeStepEntity> {
    const step = await this.recipeStepsService.update(
      userId,
      recipeId,
      stepId,
      updateRecipeStepDto,
    );
    return new RecipeStepEntity(step);
  }

  @Delete(':stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('id') userId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Param('stepId', ParseIntPipe) stepId: number,
  ): Promise<void> {
    await this.recipeStepsService.delete(userId, recipeId, stepId);
  }
}
