import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

describe('RecipesService', () => {
  let service: RecipesService;

  const mockPrismaService = {
    recipe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 1;
    const createRecipeDto: CreateRecipeDto = {
      title: 'Test Recipe',
      description: 'A test recipe',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
    };

    const createdRecipe = {
      id: 1,
      userId,
      ...createRecipeDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a recipe successfully', async () => {
      mockPrismaService.recipe.create.mockResolvedValue(createdRecipe);

      const result = await service.create(userId, createRecipeDto);

      expect(result).toEqual(createdRecipe);
      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: {
          userId,
          ...createRecipeDto,
          servings: createRecipeDto.servings,
        },
      });
      expect(mockPrismaService.recipe.create).toHaveBeenCalledTimes(1);
    });

    it('should create a recipe with default servings when not provided', async () => {
      const recipeWithoutServings: CreateRecipeDto = {
        title: 'Test Recipe',
        description: 'A test recipe',
      };

      const createdRecipeWithDefaults = {
        id: 1,
        userId,
        ...recipeWithoutServings,
        servings: 1,
        prepTime: null,
        cookTime: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.recipe.create.mockResolvedValue(
        createdRecipeWithDefaults,
      );

      const result = await service.create(userId, recipeWithoutServings);

      expect(result.servings).toBe(1);
      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: {
          userId,
          ...recipeWithoutServings,
          servings: 1,
        },
      });
    });

    it('should create a recipe with null optional fields', async () => {
      const minimalRecipe: CreateRecipeDto = {
        title: 'Minimal Recipe',
      };

      const createdMinimalRecipe = {
        id: 1,
        userId,
        title: 'Minimal Recipe',
        description: null,
        servings: 1,
        prepTime: null,
        cookTime: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.recipe.create.mockResolvedValue(createdMinimalRecipe);

      const result = await service.create(userId, minimalRecipe);

      expect(result).toEqual(createdMinimalRecipe);
      expect(result.description).toBeNull();
      expect(result.prepTime).toBeNull();
      expect(result.cookTime).toBeNull();
      expect(result.imageUrl).toBeNull();
    });
  });

  describe('findAll', () => {
    const userId = 1;
    const mockRecipes = [
      {
        id: 1,
        userId,
        title: 'Recipe 1',
        description: 'Description 1',
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        imageUrl: 'https://example.com/image1.jpg',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 2,
        userId,
        title: 'Recipe 2',
        description: 'Description 2',
        servings: 2,
        prepTime: 10,
        cookTime: 20,
        imageUrl: 'https://example.com/image2.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    it('should return all recipes for a user ordered by createdAt desc', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockRecipes);
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no recipes', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledTimes(1);
    });

    it('should only return recipes for the specified user', async () => {
      const userRecipes = [mockRecipes[0]];
      mockPrismaService.recipe.findMany.mockResolvedValue(userRecipes);

      await service.findAll(userId);

      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    const userId = 1;
    const recipeId = 1;
    const mockRecipe = {
      id: recipeId,
      userId,
      title: 'Test Recipe',
      description: 'Test description',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [
        {
          id: 1,
          recipeId,
          stepNumber: 1,
          instruction: 'Step 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      ingredients: [
        {
          id: 1,
          recipeId,
          name: 'Ingredient 1',
          quantity: '1 cup',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    it('should return a recipe with steps and ingredients', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.findOne(userId, recipeId);

      expect(result).toEqual(mockRecipe);
      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: recipeId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
          ingredients: {
            orderBy: { order: 'asc' },
          },
        },
      });
      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, recipeId)).rejects.toThrow(
        new NotFoundException(`Recipe with ID ${recipeId} not found`),
      );

      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: recipeId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
          ingredients: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    it('should throw ForbiddenException when user does not own the recipe', async () => {
      const otherUserRecipe = {
        ...mockRecipe,
        userId: 999,
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(otherUserRecipe);

      await expect(service.findOne(userId, recipeId)).rejects.toThrow(
        new ForbiddenException('You do not have access to this recipe'),
      );

      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return recipe with empty steps and ingredients arrays', async () => {
      const recipeWithoutStepsOrIngredients = {
        ...mockRecipe,
        steps: [],
        ingredients: [],
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(
        recipeWithoutStepsOrIngredients,
      );

      const result = await service.findOne(userId, recipeId);

      expect(result.steps).toEqual([]);
      expect(result.ingredients).toEqual([]);
    });
  });

  describe('update', () => {
    const userId = 1;
    const recipeId = 1;
    const updateRecipeDto: UpdateRecipeDto = {
      title: 'Updated Recipe',
      description: 'Updated description',
      servings: 6,
    };

    const existingRecipe = {
      id: recipeId,
      userId,
      title: 'Original Recipe',
      description: 'Original description',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      ingredients: [],
    };

    const updatedRecipe = {
      id: recipeId,
      userId,
      ...updateRecipeDto,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: existingRecipe.createdAt,
      updatedAt: new Date(),
    };

    it('should update a recipe successfully', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(existingRecipe);
      mockPrismaService.recipe.update.mockResolvedValue(updatedRecipe);

      const result = await service.update(userId, recipeId, updateRecipeDto);

      expect(result).toEqual(updatedRecipe);
      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: recipeId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
          ingredients: {
            orderBy: { order: 'asc' },
          },
        },
      });
      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: recipeId },
        data: updateRecipeDto,
      });
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(
        service.update(userId, recipeId, updateRecipeDto),
      ).rejects.toThrow(
        new NotFoundException(`Recipe with ID ${recipeId} not found`),
      );

      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the recipe', async () => {
      const otherUserRecipe = {
        ...existingRecipe,
        userId: 999,
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(otherUserRecipe);

      await expect(
        service.update(userId, recipeId, updateRecipeDto),
      ).rejects.toThrow(
        new ForbiddenException('You do not have access to this recipe'),
      );

      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateRecipeDto = {
        title: 'New Title Only',
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(existingRecipe);
      mockPrismaService.recipe.update.mockResolvedValue({
        ...existingRecipe,
        title: 'New Title Only',
        updatedAt: new Date(),
      });

      await service.update(userId, recipeId, partialUpdate);

      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: recipeId },
        data: partialUpdate,
      });
    });
  });

  describe('delete', () => {
    const userId = 1;
    const recipeId = 1;

    const existingRecipe = {
      id: recipeId,
      userId,
      title: 'Recipe to Delete',
      description: 'Description',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      ingredients: [],
    };

    it('should delete a recipe successfully', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(existingRecipe);
      mockPrismaService.recipe.delete.mockResolvedValue(existingRecipe);

      await service.delete(userId, recipeId);

      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: recipeId },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
          ingredients: {
            orderBy: { order: 'asc' },
          },
        },
      });
      expect(mockPrismaService.recipe.delete).toHaveBeenCalledWith({
        where: { id: recipeId },
      });
      expect(mockPrismaService.recipe.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(service.delete(userId, recipeId)).rejects.toThrow(
        new NotFoundException(`Recipe with ID ${recipeId} not found`),
      );

      expect(mockPrismaService.recipe.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the recipe', async () => {
      const otherUserRecipe = {
        ...existingRecipe,
        userId: 999,
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(otherUserRecipe);

      await expect(service.delete(userId, recipeId)).rejects.toThrow(
        new ForbiddenException('You do not have access to this recipe'),
      );

      expect(mockPrismaService.recipe.delete).not.toHaveBeenCalled();
    });
  });
});
