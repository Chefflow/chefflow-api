import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createIngredientDto: CreateIngredientDto) {}

  async find(ingredient: string) {}

  async findById(id: string) {}

  async update(id: string, updateIngredient: UpdateIngredientDto) {}

  async delete(id: string) {}
}
