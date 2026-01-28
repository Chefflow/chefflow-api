import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeIngredientsService } from './recipe-ingredients.service';
import { RecipeIngredientsController } from './recipe-ingredients.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RecipeIngredientsController],
  providers: [RecipeIngredientsService],
  exports: [RecipeIngredientsService],
})
export class RecipeIngredientsModule {}
