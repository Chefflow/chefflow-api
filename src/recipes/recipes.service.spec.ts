import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RecipeStatus } from '@prisma/client';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeIngredientsService } from '../recipe-ingredients/recipe-ingredients.service';
import { RecipeStepsService } from '../recipe-steps/recipe-steps.service';

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
    recipeIngredient: {
      createMany: jest.fn(),
    },
    recipeStep: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRecipeIngredientsService = {
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockRecipeStepsService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RecipeIngredientsService,
          useValue: mockRecipeIngredientsService,
        },
        {
          provide: RecipeStepsService,
          useValue: mockRecipeStepsService,
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

    const publishedRecipe = {
      id: 1,
      userId,
      title: 'Test Recipe',
      description: 'A test recipe',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
      status: RecipeStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients: [
        {
          id: 1,
          recipeId: 1,
          ingredientName: 'Flour',
          quantity: 200,
          unit: 'GRAM',
          notes: null,
          order: 0,
        },
      ],
      steps: [
        {
          id: 1,
          recipeId: 1,
          stepNumber: 1,
          instruction: 'Mix',
          duration: null,
        },
      ],
    };

    it('should create a DRAFT recipe without title', async () => {
      const draftDto: CreateRecipeDto = { status: RecipeStatus.DRAFT };
      const draftRecipe = {
        id: 1,
        userId,
        title: null,
        description: null,
        servings: 1,
        prepTime: null,
        cookTime: null,
        imageUrl: null,
        status: RecipeStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        ingredients: [],
        steps: [],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          recipe: {
            create: jest.fn().mockResolvedValue(draftRecipe),
            findUnique: jest.fn().mockResolvedValue(draftRecipe),
          },
        };
        return callback(tx);
      });

      const result = await service.create(userId, draftDto);

      expect(result).toEqual(draftRecipe);
      expect(result?.title).toBeNull();
      expect(result?.status).toBe(RecipeStatus.DRAFT);
    });

    it('should create a PUBLISHED recipe with all required fields', async () => {
      const createDto: CreateRecipeDto = {
        title: 'Test Recipe',
        prepTime: 15,
        ingredients: [
          { ingredientName: 'Flour', quantity: 200, unit: 'GRAM' as any },
        ],
        steps: [{ instruction: 'Mix' }],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          recipe: {
            create: jest.fn().mockResolvedValue(publishedRecipe),
            findUnique: jest.fn().mockResolvedValue(publishedRecipe),
          },
          recipeIngredient: { findFirst: jest.fn() },
          recipeStep: { findFirst: jest.fn() },
        };
        return callback(tx);
      });

      mockRecipeIngredientsService.add.mockResolvedValue({});
      mockRecipeStepsService.create.mockResolvedValue({});

      const result = await service.create(userId, createDto);

      expect(result?.status).toBe(RecipeStatus.PUBLISHED);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when creating PUBLISHED without title', async () => {
      const createDto: CreateRecipeDto = {
        prepTime: 15,
        ingredients: [
          { ingredientName: 'Flour', quantity: 200, unit: 'GRAM' as any },
        ],
        steps: [{ instruction: 'Mix' }],
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when creating PUBLISHED without prepTime', async () => {
      const createDto: CreateRecipeDto = {
        title: 'Test',
        ingredients: [
          { ingredientName: 'Flour', quantity: 200, unit: 'GRAM' as any },
        ],
        steps: [{ instruction: 'Mix' }],
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when creating PUBLISHED without ingredients', async () => {
      const createDto: CreateRecipeDto = {
        title: 'Test',
        prepTime: 15,
        steps: [{ instruction: 'Mix' }],
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a recipe with default servings when not provided', async () => {
      const recipeWithoutServings: CreateRecipeDto = {
        status: RecipeStatus.DRAFT,
      };

      const createdRecipeWithDefaults = {
        id: 1,
        userId,
        title: null,
        description: null,
        servings: 1,
        prepTime: null,
        cookTime: null,
        imageUrl: null,
        status: RecipeStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        ingredients: [],
        steps: [],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          recipe: {
            create: jest.fn().mockResolvedValue(createdRecipeWithDefaults),
            findUnique: jest.fn().mockResolvedValue(createdRecipeWithDefaults),
          },
        };
        return callback(tx);
      });

      const result = await service.create(userId, recipeWithoutServings);

      expect(result?.servings).toBe(1);
    });

    it('should create a recipe with ingredients and steps', async () => {
      const recipeWithAll: CreateRecipeDto = {
        title: 'Complete Recipe',
        description: 'A complete recipe',
        servings: 4,
        prepTime: 15,
        ingredients: [
          {
            ingredientName: 'Pasta',
            quantity: 400,
            unit: 'GRAM' as any,
            notes: 'Spaghetti',
          },
          {
            ingredientName: 'Tomato',
            quantity: 3,
            unit: 'UNIT' as any,
          },
        ],
        steps: [
          { instruction: 'Boil water' },
          { instruction: 'Cook pasta', duration: 10 },
        ],
      };

      const createdRecipeWithAll = {
        id: 1,
        userId,
        title: 'Complete Recipe',
        description: 'A complete recipe',
        servings: 4,
        prepTime: 15,
        cookTime: null,
        imageUrl: null,
        status: RecipeStatus.PUBLISHED,
        ingredients: [
          {
            id: 1,
            recipeId: 1,
            ingredientName: 'Pasta',
            quantity: 400,
            unit: 'GRAM',
            notes: 'Spaghetti',
            order: 0,
          },
          {
            id: 2,
            recipeId: 1,
            ingredientName: 'Tomato',
            quantity: 3,
            unit: 'UNIT',
            notes: null,
            order: 1,
          },
        ],
        steps: [
          {
            id: 1,
            recipeId: 1,
            stepNumber: 1,
            instruction: 'Boil water',
            duration: null,
          },
          {
            id: 2,
            recipeId: 1,
            stepNumber: 2,
            instruction: 'Cook pasta',
            duration: 10,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecipeIngredientsService.add.mockResolvedValue({});
      mockRecipeStepsService.create.mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          recipe: {
            create: jest.fn().mockResolvedValue({ id: 1, userId }),
            findUnique: jest.fn().mockResolvedValue(createdRecipeWithAll),
          },
          recipeIngredient: { findFirst: jest.fn() },
          recipeStep: { findFirst: jest.fn() },
        };
        return callback(tx);
      });

      const result = await service.create(userId, recipeWithAll);

      expect(result).toEqual(createdRecipeWithAll);
      expect(result?.ingredients).toHaveLength(2);
      expect(result?.steps).toHaveLength(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockRecipeIngredientsService.add).toHaveBeenCalledTimes(2);
      expect(mockRecipeStepsService.create).toHaveBeenCalledTimes(2);
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
        status: RecipeStatus.PUBLISHED,
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
        status: RecipeStatus.PUBLISHED,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    it('should return only PUBLISHED recipes for a user ordered by createdAt desc', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockRecipes);
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        where: { userId, status: RecipeStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no published recipes', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });

    it('should filter by PUBLISHED status', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue(mockRecipes);

      await service.findAll(userId);

      const call = mockPrismaService.recipe.findMany.mock.calls[0][0];
      expect(call.where.status).toBe(RecipeStatus.PUBLISHED);
    });
  });

  describe('findAllDrafts', () => {
    const userId = 1;
    const mockDrafts = [
      {
        id: 3,
        userId,
        title: null,
        description: null,
        servings: 1,
        prepTime: null,
        cookTime: null,
        imageUrl: null,
        status: RecipeStatus.DRAFT,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        ingredients: [],
        steps: [],
      },
    ];

    it('should return only DRAFT recipes with ingredients and steps', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue(mockDrafts);

      const result = await service.findAllDrafts(userId);

      expect(result).toEqual(mockDrafts);
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        where: { userId, status: RecipeStatus.DRAFT },
        orderBy: { updatedAt: 'desc' },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { stepNumber: 'asc' } },
        },
      });
    });

    it('should return empty array when user has no drafts', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue([]);

      const result = await service.findAllDrafts(userId);

      expect(result).toEqual([]);
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
      status: RecipeStatus.PUBLISHED,
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
    });

    it('should throw ForbiddenException when user does not own the recipe', async () => {
      const otherUserRecipe = { ...mockRecipe, userId: 999 };
      mockPrismaService.recipe.findUnique.mockResolvedValue(otherUserRecipe);

      await expect(service.findOne(userId, recipeId)).rejects.toThrow(
        new ForbiddenException('You do not have access to this recipe'),
      );
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

    const existingDraft = {
      id: recipeId,
      userId,
      title: null,
      description: null,
      servings: 1,
      prepTime: null,
      cookTime: null,
      imageUrl: null,
      status: RecipeStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      ingredients: [],
    };

    const existingPublished = {
      id: recipeId,
      userId,
      title: 'Original Recipe',
      description: 'Original description',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
      status: RecipeStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [
        {
          id: 1,
          recipeId,
          stepNumber: 1,
          instruction: 'Step 1',
          duration: null,
        },
      ],
      ingredients: [
        {
          id: 1,
          recipeId,
          ingredientName: 'Flour',
          quantity: 200,
          unit: 'GRAM',
          notes: null,
          order: 0,
        },
      ],
    };

    it('should update a recipe successfully', async () => {
      const updateDto: UpdateRecipeDto = {
        title: 'Updated Title',
        description: 'New desc',
      };
      const updatedRecipe = { ...existingPublished, ...updateDto };

      mockPrismaService.recipe.findUnique.mockResolvedValue(existingPublished);
      mockPrismaService.recipe.update.mockResolvedValue(updatedRecipe);

      const result = await service.update(userId, recipeId, updateDto);

      expect(result).toEqual(updatedRecipe);
      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: recipeId },
        data: updateDto,
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { stepNumber: 'asc' } },
        },
      });
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(
        service.update(userId, recipeId, { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the recipe', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        ...existingPublished,
        userId: 999,
      });

      await expect(
        service.update(userId, recipeId, { title: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });

    it('should publish a draft when all required fields are present', async () => {
      const draftWithData = {
        ...existingDraft,
        title: 'My Recipe',
        prepTime: 10,
        ingredients: [
          {
            id: 1,
            recipeId,
            ingredientName: 'Flour',
            quantity: 200,
            unit: 'GRAM',
            notes: null,
            order: 0,
          },
        ],
        steps: [
          {
            id: 1,
            recipeId,
            stepNumber: 1,
            instruction: 'Mix',
            duration: null,
          },
        ],
      };
      const updateDto: UpdateRecipeDto = { status: RecipeStatus.PUBLISHED };
      const publishedRecipe = {
        ...draftWithData,
        status: RecipeStatus.PUBLISHED,
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(draftWithData);
      mockPrismaService.recipe.update.mockResolvedValue(publishedRecipe);

      const result = await service.update(userId, recipeId, updateDto);

      expect(result.status).toBe(RecipeStatus.PUBLISHED);
    });

    it('should throw BadRequestException when publishing draft without title', async () => {
      const draftWithData = {
        ...existingDraft,
        prepTime: 10,
        ingredients: [{ id: 1 }],
        steps: [{ id: 1 }],
      };
      const updateDto: UpdateRecipeDto = { status: RecipeStatus.PUBLISHED };

      mockPrismaService.recipe.findUnique.mockResolvedValue(draftWithData);

      await expect(service.update(userId, recipeId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when publishing draft without ingredients', async () => {
      const draftWithData = {
        ...existingDraft,
        title: 'My Recipe',
        prepTime: 10,
        steps: [{ id: 1 }],
        ingredients: [],
      };
      const updateDto: UpdateRecipeDto = { status: RecipeStatus.PUBLISHED };

      mockPrismaService.recipe.findUnique.mockResolvedValue(draftWithData);

      await expect(service.update(userId, recipeId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not re-validate when updating a PUBLISHED recipe fields', async () => {
      const updateDto: UpdateRecipeDto = { title: 'New Title' };
      const updatedRecipe = { ...existingPublished, title: 'New Title' };

      mockPrismaService.recipe.findUnique.mockResolvedValue(existingPublished);
      mockPrismaService.recipe.update.mockResolvedValue(updatedRecipe);

      const result = await service.update(userId, recipeId, updateDto);

      expect(result.title).toBe('New Title');
    });

    it('should update only provided fields', async () => {
      const partialUpdate: UpdateRecipeDto = { title: 'New Title Only' };

      mockPrismaService.recipe.findUnique.mockResolvedValue(existingPublished);
      mockPrismaService.recipe.update.mockResolvedValue({
        ...existingPublished,
        title: 'New Title Only',
      });

      await service.update(userId, recipeId, partialUpdate);

      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: partialUpdate }),
      );
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
      status: RecipeStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
      ingredients: [],
    };

    it('should delete a recipe successfully', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(existingRecipe);
      mockPrismaService.recipe.delete.mockResolvedValue(existingRecipe);

      await service.delete(userId, recipeId);

      expect(mockPrismaService.recipe.delete).toHaveBeenCalledWith({
        where: { id: recipeId },
      });
      expect(mockPrismaService.recipe.delete).toHaveBeenCalledTimes(1);
    });

    it('should delete a DRAFT recipe successfully', async () => {
      const draftRecipe = {
        ...existingRecipe,
        status: RecipeStatus.DRAFT,
        title: null,
      };
      mockPrismaService.recipe.findUnique.mockResolvedValue(draftRecipe);
      mockPrismaService.recipe.delete.mockResolvedValue(draftRecipe);

      await service.delete(userId, recipeId);

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
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        ...existingRecipe,
        userId: 999,
      });

      await expect(service.delete(userId, recipeId)).rejects.toThrow(
        new ForbiddenException('You do not have access to this recipe'),
      );

      expect(mockPrismaService.recipe.delete).not.toHaveBeenCalled();
    });
  });
});
