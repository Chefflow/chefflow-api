import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeStepsService } from './recipe-steps.service';
import { RecipeStepsController } from './recipe-steps.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RecipeStepsController],
  providers: [RecipeStepsService],
})
export class RecipeStepsModule {}
