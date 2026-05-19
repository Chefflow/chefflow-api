import { Test, TestingModule } from '@nestjs/testing';
import { RecipeStatus } from '@prisma/client';
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
    findAllDrafts: jest.fn(),
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
    status: RecipeStatus.PUBLISHED,
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

  const mockDraftRecipe = {
    id: 2,
    userId: 1,
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

    it('should create a DRAFT recipe without title', async () => {
      const draftDto: CreateRecipeDto = { status: RecipeStatus.DRAFT };
      mockRecipesService.create.mockResolvedValue(mockDraftRecipe);

      const result = await controller.create(userId, draftDto);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.title).toBeNull();
      expect(result.status).toBe(RecipeStatus.DRAFT);
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
        status: RecipeStatus.PUBLISHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return array of RecipeEntity (PUBLISHED only)', async () => {
      mockRecipesService.findAll.mockResolvedValue(mockRecipes);

      const result = await controller.findAll(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(RecipeEntity);
      expect(result[1]).toBeInstanceOf(RecipeEntity);
      expect(mockRecipesService.findAll).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when user has no published recipes', async () => {
      mockRecipesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(userId);

      expect(result).toEqual([]);
    });

    it('should call service with correct userId', async () => {
      const differentUserId = 999;
      mockRecipesService.findAll.mockResolvedValue([]);

      await controller.findAll(differentUserId);

      expect(mockRecipesService.findAll).toHaveBeenCalledWith(differentUserId);
    });
  });

  describe('findAllDrafts', () => {
    const userId = 1;

    it('should return array of draft RecipeEntity', async () => {
      mockRecipesService.findAllDrafts.mockResolvedValue([mockDraftRecipe]);

      const result = await controller.findAllDrafts(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(RecipeEntity);
      expect(result[0].status).toBe(RecipeStatus.DRAFT);
      expect(mockRecipesService.findAllDrafts).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when user has no drafts', async () => {
      mockRecipesService.findAllDrafts.mockResolvedValue([]);

      const result = await controller.findAllDrafts(userId);

      expect(result).toEqual([]);
    });

    it('should call service with correct userId', async () => {
      mockRecipesService.findAllDrafts.mockResolvedValue([]);

      await controller.findAllDrafts(userId);

      expect(mockRecipesService.findAllDrafts).toHaveBeenCalledWith(userId);
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
    });

    it('should publish a draft recipe', async () => {
      const publishDto: UpdateRecipeDto = { status: RecipeStatus.PUBLISHED };
      const publishedRecipe = { ...mockRecipe, status: RecipeStatus.PUBLISHED };
      mockRecipesService.update.mockResolvedValue(publishedRecipe);

      const result = await controller.update(userId, recipeId, publishDto);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.status).toBe(RecipeStatus.PUBLISHED);
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdateRecipeDto = { title: 'New Title Only' };
      const partiallyUpdated = { ...mockRecipe, title: 'New Title Only' };
      mockRecipesService.update.mockResolvedValue(partiallyUpdated);

      const result = await controller.update(userId, recipeId, partialUpdate);

      expect(result).toBeInstanceOf(RecipeEntity);
      expect(result.title).toBe('New Title Only');
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
    });

    it('should delete a DRAFT recipe successfully', async () => {
      mockRecipesService.delete.mockResolvedValue(undefined);

      await controller.delete(userId, recipeId);

      expect(mockRecipesService.delete).toHaveBeenCalledWith(userId, recipeId);
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

    it('should transform drafts to RecipeEntity in findAllDrafts', async () => {
      mockRecipesService.findAllDrafts.mockResolvedValue([mockDraftRecipe]);

      const result = await controller.findAllDrafts(1);

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
