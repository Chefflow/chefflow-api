import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeEntity } from './entities/recipe.entity';

describe('RecipesController', () => {
  let controller: RecipesController;

  const mockRecipesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockRecipe = {
    id: 1,
    userId: 1,
    title: 'Test Recipe',
    description: 'Test description',
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    imageUrl: 'https://example.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecipeWithRelations = {
    ...mockRecipe,
    steps: [
      {
        id: 1,
        recipeId: 1,
        stepNumber: 1,
        instruction: 'Step 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ingredients: [
      {
        id: 1,
        recipeId: 1,
        name: 'Ingredient 1',
        quantity: '1 cup',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [
        {
          provide: RecipesService,
          useValue: mockRecipesService,
        },
      ],
    }).compile();

    controller = module.get<RecipesController>(RecipesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const userId = 1;
    const createRecipeDto: CreateRecipeDto = {
      title: 'New Recipe',
      description: 'New description',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      imageUrl: 'https://example.com/image.jpg',
    };

    it('should create a recipe and return RecipeEntity', async () => {
      mockRecipesService.create.mockResolvedValue(mockRecipe);

      const result = await controller.create(userId, createRecipeDto);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.id).toBe(mockRecipe.id);
      expect(result.title).toBe(mockRecipe.title);
      expect(mockRecipesService.create).toHaveBeenCalledWith(
        userId,
        createRecipeDto,
      );
      expect(mockRecipesService.create).toHaveBeenCalledTimes(1);
    });

    it('should create a recipe with minimal data', async () => {
      const minimalDto: CreateRecipeDto = {
        title: 'Minimal Recipe',
      };

      const minimalRecipe = {
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

      mockRecipesService.create.mockResolvedValue(minimalRecipe);

      const result = await controller.create(userId, minimalDto);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.title).toBe('Minimal Recipe');
      expect(mockRecipesService.create).toHaveBeenCalledWith(userId, minimalDto);
    });

    it('should pass userId from decorator to service', async () => {
      mockRecipesService.create.mockResolvedValue(mockRecipe);

      await controller.create(userId, createRecipeDto);

      expect(mockRecipesService.create).toHaveBeenCalledWith(
        userId,
        createRecipeDto,
      );
    });
  });

  describe('findAll', () => {
    const userId = 1;
    const mockRecipes = [
      mockRecipe,
      {
        id: 2,
        userId,
        title: 'Recipe 2',
        description: 'Description 2',
        servings: 2,
        prepTime: 10,
        cookTime: 20,
        imageUrl: 'https://example.com/image2.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return array of RecipeEntity', async () => {
      mockRecipesService.findAll.mockResolvedValue(mockRecipes);

      const result = await controller.findAll(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(RecipeEntity);
      expect(result[1]).toBeInstanceOf(RecipeEntity);
      expect(mockRecipesService.findAll).toHaveBeenCalledWith(userId);
      expect(mockRecipesService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no recipes', async () => {
      mockRecipesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(userId);

      expect(result).toEqual([]);
      expect(mockRecipesService.findAll).toHaveBeenCalledWith(userId);
    });

    it('should call service with correct userId', async () => {
      const differentUserId = 999;
      mockRecipesService.findAll.mockResolvedValue([]);

      await controller.findAll(differentUserId);

      expect(mockRecipesService.findAll).toHaveBeenCalledWith(differentUserId);
    });
  });

  describe('findOne', () => {
    const userId = 1;
    const recipeId = 1;

    it('should return a RecipeEntity with relations', async () => {
      mockRecipesService.findOne.mockResolvedValue(mockRecipeWithRelations);

      const result = await controller.findOne(userId, recipeId);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.id).toBe(recipeId);
      expect(mockRecipesService.findOne).toHaveBeenCalledWith(userId, recipeId);
      expect(mockRecipesService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should call service with correct parameters', async () => {
      mockRecipesService.findOne.mockResolvedValue(mockRecipeWithRelations);

      await controller.findOne(userId, recipeId);

      expect(mockRecipesService.findOne).toHaveBeenCalledWith(userId, recipeId);
    });

    it('should handle different recipe IDs', async () => {
      const differentRecipeId = 999;
      const differentRecipe = {
        ...mockRecipeWithRelations,
        id: differentRecipeId,
      };

      mockRecipesService.findOne.mockResolvedValue(differentRecipe);

      const result = await controller.findOne(userId, differentRecipeId);

      expect(result.id).toBe(differentRecipeId);
      expect(mockRecipesService.findOne).toHaveBeenCalledWith(
        userId,
        differentRecipeId,
      );
    });
  });

  describe('update', () => {
    const userId = 1;
    const recipeId = 1;
    const updateRecipeDto: UpdateRecipeDto = {
      title: 'Updated Recipe',
      description: 'Updated description',
    };

    const updatedRecipe = {
      ...mockRecipe,
      title: 'Updated Recipe',
      description: 'Updated description',
      updatedAt: new Date(),
    };

    it('should update a recipe and return RecipeEntity', async () => {
      mockRecipesService.update.mockResolvedValue(updatedRecipe);

      const result = await controller.update(userId, recipeId, updateRecipeDto);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.title).toBe('Updated Recipe');
      expect(result.description).toBe('Updated description');
      expect(mockRecipesService.update).toHaveBeenCalledWith(
        userId,
        recipeId,
        updateRecipeDto,
      );
      expect(mockRecipesService.update).toHaveBeenCalledTimes(1);
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdateRecipeDto = {
        title: 'New Title Only',
      };

      const partiallyUpdated = {
        ...mockRecipe,
        title: 'New Title Only',
        updatedAt: new Date(),
      };

      mockRecipesService.update.mockResolvedValue(partiallyUpdated);

      const result = await controller.update(userId, recipeId, partialUpdate);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.title).toBe('New Title Only');
      expect(mockRecipesService.update).toHaveBeenCalledWith(
        userId,
        recipeId,
        partialUpdate,
      );
    });

    it('should pass all parameters correctly to service', async () => {
      mockRecipesService.update.mockResolvedValue(updatedRecipe);

      await controller.update(userId, recipeId, updateRecipeDto);

      expect(mockRecipesService.update).toHaveBeenCalledWith(
        userId,
        recipeId,
        updateRecipeDto,
      );
    });
  });

  describe('delete', () => {
    const userId = 1;
    const recipeId = 1;

    it('should delete a recipe successfully', async () => {
      mockRecipesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(userId, recipeId);

      expect(result).toBeUndefined();
      expect(mockRecipesService.delete).toHaveBeenCalledWith(userId, recipeId);
      expect(mockRecipesService.delete).toHaveBeenCalledTimes(1);
    });

    it('should call service with correct parameters', async () => {
      mockRecipesService.delete.mockResolvedValue(undefined);

      await controller.delete(userId, recipeId);

      expect(mockRecipesService.delete).toHaveBeenCalledWith(userId, recipeId);
    });

    it('should handle different recipe IDs', async () => {
      const differentRecipeId = 999;
      mockRecipesService.delete.mockResolvedValue(undefined);

      await controller.delete(userId, differentRecipeId);

      expect(mockRecipesService.delete).toHaveBeenCalledWith(
        userId,
        differentRecipeId,
      );
    });

    it('should handle different user IDs', async () => {
      const differentUserId = 999;
      mockRecipesService.delete.mockResolvedValue(undefined);

      await controller.delete(differentUserId, recipeId);

      expect(mockRecipesService.delete).toHaveBeenCalledWith(
        differentUserId,
        recipeId,
      );
    });
  });

  describe('RecipeEntity transformation', () => {
    it('should transform all recipes to RecipeEntity in findAll', async () => {
      const recipes = [mockRecipe, { ...mockRecipe, id: 2 }];
      mockRecipesService.findAll.mockResolvedValue(recipes);

      const result = await controller.findAll(1);

      result.forEach((recipe) => {
        expect(recipe).toBeInstanceOf(RecipeEntity);
      });
    });

    it('should transform single recipe to RecipeEntity in findOne', async () => {
      mockRecipesService.findOne.mockResolvedValue(mockRecipe);

      const result = await controller.findOne(1, 1);

      expect(result).toBeInstanceOf(RecipeEntity);
    });

    it('should transform created recipe to RecipeEntity', async () => {
      mockRecipesService.create.mockResolvedValue(mockRecipe);

      const result = await controller.create(1, { title: 'Test' });

      expect(result).toBeInstanceOf(RecipeEntity);
    });

    it('should transform updated recipe to RecipeEntity', async () => {
      mockRecipesService.update.mockResolvedValue(mockRecipe);

      const result = await controller.update(1, 1, { title: 'Updated' });

      expect(result).toBeInstanceOf(RecipeEntity);
    });
  });
});
