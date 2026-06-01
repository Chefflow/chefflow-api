import { Test, TestingModule } from '@nestjs/testing';
import type { DayOfWeek } from '@prisma/client';
import { WeeklyPlanningsController } from './weekly-plannings.controller';
import { WeeklyPlanningsService } from './weekly-plannings.service';
import { CreateWeeklyPlanningDto } from './dto/create-weekly-planning.dto';
import { UpdateWeeklyPlanningDto } from './dto/update-weekly-planning.dto';
import { AddRecipeToSlotDto } from './dto/add-recipe-to-slot.dto';
import { WeeklyPlanningEntity } from './entities/weekly-planning.entity';
import { WeeklyPlanningSlotEntity } from './entities/weekly-planning-slot.entity';
import { RecipeEntity } from '../recipes/entities/recipe.entity';

describe('WeeklyPlanningsController', () => {
  let controller: WeeklyPlanningsController;

  const mockWeeklyPlanningsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addRecipeToSlot: jest.fn(),
    removeRecipeFromSlot: jest.fn(),
    deleteSlot: jest.fn(),
  };

  const mockWeeklyPlanning = {
    id: 1,
    userId: 1,
    weekStart: new Date('2026-05-10'),
    weekEnd: new Date('2026-05-16'),
    slotsPerDay: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    slots: [],
  };

  const mockWeeklyPlanningWithSlots = {
    id: 1,
    userId: 1,
    weekStart: new Date('2026-05-10'),
    weekEnd: new Date('2026-05-16'),
    slotsPerDay: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    slots: [
      {
        id: 10,
        weeklyPlanningId: 1,
        dayOfWeek: 'MONDAY' as const,
        slotNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipes: [
          {
            id: 5,
            userId: 1,
            title: 'Curry',
            description: 'Spicy curry',
            status: 'PUBLISHED',
            servings: 4,
            prepTime: 15,
            cookTime: 30,
            imageUrl: 'https://example.com/curry.jpg',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    ],
  };

  const mockSlotFromService = {
    id: 10,
    weeklyPlanningId: 1,
    dayOfWeek: 'MONDAY' as const,
    slotNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    recipes: [
      {
        id: 100,
        slotId: 10,
        recipeId: 5,
        position: 1,
        addedAt: new Date(),
        recipe: {
          id: 5,
          userId: 1,
          title: 'Curry',
          description: 'Spicy curry',
          status: 'PUBLISHED',
          servings: 4,
          prepTime: 15,
          cookTime: 30,
          imageUrl: 'https://example.com/curry.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeeklyPlanningsController],
      providers: [
        {
          provide: WeeklyPlanningsService,
          useValue: mockWeeklyPlanningsService,
        },
      ],
    }).compile();

    controller = module.get<WeeklyPlanningsController>(
      WeeklyPlanningsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const userId = 1;
    const createDto: CreateWeeklyPlanningDto = {
      weekStart: '2026-05-10',
    };

    it('should pass userId from CurrentUser and dto to service.create', async () => {
      mockWeeklyPlanningsService.create.mockResolvedValue(mockWeeklyPlanning);

      const result = await controller.create(userId, createDto);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result.id).toBe(mockWeeklyPlanning.id);
      expect(mockWeeklyPlanningsService.create).toHaveBeenCalledWith(
        userId,
        createDto,
      );
      expect(mockWeeklyPlanningsService.create).toHaveBeenCalledTimes(1);
    });

    it('should return WeeklyPlanningEntity instance', async () => {
      mockWeeklyPlanningsService.create.mockResolvedValue(mockWeeklyPlanning);

      const result = await controller.create(userId, createDto);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result.weekStart).toEqual(mockWeeklyPlanning.weekStart);
      expect(result.slotsPerDay).toBe(mockWeeklyPlanning.slotsPerDay);
    });
  });

  describe('findAll', () => {
    const userId = 1;
    const mockPlannings = [
      mockWeeklyPlanning,
      {
        id: 2,
        userId,
        weekStart: new Date('2026-05-17'),
        weekEnd: new Date('2026-05-23'),
        slotsPerDay: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      },
    ];

    it('should map service result to WeeklyPlanningEntity[]', async () => {
      mockWeeklyPlanningsService.findAll.mockResolvedValue(mockPlannings);

      const result = await controller.findAll(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result[1]).toBeInstanceOf(WeeklyPlanningEntity);
      expect(mockWeeklyPlanningsService.findAll).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when user has no plannings', async () => {
      mockWeeklyPlanningsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(userId);

      expect(result).toEqual([]);
    });

    it('should call service with correct userId', async () => {
      const differentUserId = 999;
      mockWeeklyPlanningsService.findAll.mockResolvedValue([]);

      await controller.findAll(differentUserId);

      expect(mockWeeklyPlanningsService.findAll).toHaveBeenCalledWith(
        differentUserId,
      );
    });
  });

  describe('findOne', () => {
    const userId = 1;
    const planningId = 1;

    it('should call service.findOne with userId and id and return WeeklyPlanningEntity', async () => {
      mockWeeklyPlanningsService.findOne.mockResolvedValue(
        mockWeeklyPlanningWithSlots,
      );

      const result = await controller.findOne(userId, planningId);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result.id).toBe(planningId);
      expect(mockWeeklyPlanningsService.findOne).toHaveBeenCalledWith(
        userId,
        planningId,
      );
    });

    it('should return WeeklyPlanningEntity with slots', async () => {
      mockWeeklyPlanningsService.findOne.mockResolvedValue(
        mockWeeklyPlanningWithSlots,
      );

      const result = await controller.findOne(userId, planningId);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result.slots).toBeDefined();
      expect(Array.isArray(result.slots)).toBe(true);
    });

    it('should handle different planning IDs', async () => {
      const differentPlanningId = 999;
      const differentPlanning = {
        ...mockWeeklyPlanningWithSlots,
        id: differentPlanningId,
      };
      mockWeeklyPlanningsService.findOne.mockResolvedValue(differentPlanning);

      const result = await controller.findOne(userId, differentPlanningId);

      expect(result.id).toBe(differentPlanningId);
    });
  });

  describe('update', () => {
    const userId = 1;
    const planningId = 1;
    const updateDto: UpdateWeeklyPlanningDto = {
      slotsPerDay: 3,
    };

    const updatedPlanning = {
      ...mockWeeklyPlanning,
      slotsPerDay: 3,
      updatedAt: new Date(),
    };

    it('should call service.update with userId, id, dto', async () => {
      mockWeeklyPlanningsService.update.mockResolvedValue(updatedPlanning);

      const result = await controller.update(userId, planningId, updateDto);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(mockWeeklyPlanningsService.update).toHaveBeenCalledWith(
        userId,
        planningId,
        updateDto,
      );
    });

    it('should return updated WeeklyPlanningEntity', async () => {
      mockWeeklyPlanningsService.update.mockResolvedValue(updatedPlanning);

      const result = await controller.update(userId, planningId, updateDto);

      expect(result.slotsPerDay).toBe(3);
    });

    it('should handle partial updates', async () => {
      const partialUpdate: UpdateWeeklyPlanningDto = { slotsPerDay: 4 };
      const partiallyUpdated = {
        ...mockWeeklyPlanning,
        slotsPerDay: 4,
      };
      mockWeeklyPlanningsService.update.mockResolvedValue(partiallyUpdated);

      const result = await controller.update(userId, planningId, partialUpdate);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result.slotsPerDay).toBe(4);
    });
  });

  describe('delete', () => {
    const userId = 1;
    const planningId = 1;

    it('should call service.delete with userId and id', async () => {
      mockWeeklyPlanningsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(userId, planningId);

      expect(result).toBeUndefined();
      expect(mockWeeklyPlanningsService.delete).toHaveBeenCalledWith(
        userId,
        planningId,
      );
    });

    it('should return void', async () => {
      mockWeeklyPlanningsService.delete.mockResolvedValue(undefined);

      await controller.delete(userId, planningId);

      expect(mockWeeklyPlanningsService.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('addRecipeToSlot', () => {
    const userId = 1;
    const planningId = 1;
    const day: DayOfWeek = 'MONDAY';
    const slot = 1;
    const dto: AddRecipeToSlotDto = { recipeId: 5 };

    it('should call service.addRecipeToSlot with all params and return WeeklyPlanningSlotEntity with mapped recipes', async () => {
      mockWeeklyPlanningsService.addRecipeToSlot.mockResolvedValue(
        mockSlotFromService,
      );

      const result = await controller.addRecipeToSlot(
        userId,
        planningId,
        day,
        slot,
        dto,
      );

      expect(result).toBeInstanceOf(WeeklyPlanningSlotEntity);
      expect(result.id).toBe(mockSlotFromService.id);
      expect(result.dayOfWeek).toBe(day);
      expect(mockWeeklyPlanningsService.addRecipeToSlot).toHaveBeenCalledWith(
        userId,
        planningId,
        day,
        slot,
        dto.recipeId,
      );
    });

    it('should map raw recipes (junction shape with .recipe) into RecipeEntity[]', async () => {
      mockWeeklyPlanningsService.addRecipeToSlot.mockResolvedValue(
        mockSlotFromService,
      );

      const result = await controller.addRecipeToSlot(
        userId,
        planningId,
        day,
        slot,
        dto,
      );

      expect(Array.isArray(result.recipes)).toBe(true);
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0]).toBeInstanceOf(RecipeEntity);
      expect(result.recipes[0].id).toBe(5);
      expect(result.recipes[0].title).toBe('Curry');
    });

    it('should handle multiple recipes in slot', async () => {
      const slotWithMultipleRecipes = {
        ...mockSlotFromService,
        recipes: [
          { ...mockSlotFromService.recipes[0] },
          {
            id: 101,
            slotId: 10,
            recipeId: 6,
            position: 2,
            addedAt: new Date(),
            recipe: {
              id: 6,
              userId: 1,
              title: 'Pasta',
              description: 'Italian pasta',
              status: 'PUBLISHED',
              servings: 2,
              prepTime: 10,
              cookTime: 20,
              imageUrl: 'https://example.com/pasta.jpg',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };
      mockWeeklyPlanningsService.addRecipeToSlot.mockResolvedValue(
        slotWithMultipleRecipes,
      );

      const result = await controller.addRecipeToSlot(
        userId,
        planningId,
        day,
        slot,
        dto,
      );

      expect(result.recipes).toHaveLength(2);
      result.recipes.forEach((recipe) => {
        expect(recipe).toBeInstanceOf(RecipeEntity);
      });
    });
  });

  describe('removeRecipeFromSlot', () => {
    const userId = 1;
    const planningId = 1;
    const day: DayOfWeek = 'MONDAY';
    const slot = 1;
    const recipeId = 5;

    it('should call service.removeRecipeFromSlot with all params', async () => {
      mockWeeklyPlanningsService.removeRecipeFromSlot.mockResolvedValue(
        undefined,
      );

      const result = await controller.removeRecipeFromSlot(
        userId,
        planningId,
        day,
        slot,
        recipeId,
      );

      expect(result).toBeUndefined();
      expect(
        mockWeeklyPlanningsService.removeRecipeFromSlot,
      ).toHaveBeenCalledWith(userId, planningId, day, slot, recipeId);
    });

    it('should return void / no body', async () => {
      mockWeeklyPlanningsService.removeRecipeFromSlot.mockResolvedValue(
        undefined,
      );

      await controller.removeRecipeFromSlot(
        userId,
        planningId,
        day,
        slot,
        recipeId,
      );

      expect(
        mockWeeklyPlanningsService.removeRecipeFromSlot,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteSlot', () => {
    const userId = 1;
    const planningId = 1;
    const day: DayOfWeek = 'TUESDAY';
    const slot = 2;

    it('should call service.deleteSlot with all params', async () => {
      mockWeeklyPlanningsService.deleteSlot.mockResolvedValue(undefined);

      const result = await controller.deleteSlot(userId, planningId, day, slot);

      expect(result).toBeUndefined();
      expect(mockWeeklyPlanningsService.deleteSlot).toHaveBeenCalledWith(
        userId,
        planningId,
        day,
        slot,
      );
    });

    it('should return void', async () => {
      mockWeeklyPlanningsService.deleteSlot.mockResolvedValue(undefined);

      await controller.deleteSlot(userId, planningId, day, slot);

      expect(mockWeeklyPlanningsService.deleteSlot).toHaveBeenCalledTimes(1);
    });

    it('should handle different day/slot combinations', async () => {
      const differentDay: DayOfWeek = 'FRIDAY';
      const differentSlot = 3;
      mockWeeklyPlanningsService.deleteSlot.mockResolvedValue(undefined);

      await controller.deleteSlot(
        userId,
        planningId,
        differentDay,
        differentSlot,
      );

      expect(mockWeeklyPlanningsService.deleteSlot).toHaveBeenCalledWith(
        userId,
        planningId,
        differentDay,
        differentSlot,
      );
    });
  });

  describe('Entity transformation', () => {
    const userId = 1;

    it('should transform create result to WeeklyPlanningEntity', async () => {
      mockWeeklyPlanningsService.create.mockResolvedValue(mockWeeklyPlanning);

      const result = await controller.create(userId, {
        weekStart: new Date('2026-05-10'),
      });

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
    });

    it('should transform findOne result to WeeklyPlanningEntity with slots', async () => {
      mockWeeklyPlanningsService.findOne.mockResolvedValue(
        mockWeeklyPlanningWithSlots,
      );

      const result = await controller.findOne(userId, 1);

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
      expect(result.slots).toBeDefined();
      if (result.slots && result.slots.length > 0) {
        expect(result.slots[0]).toBeInstanceOf(WeeklyPlanningSlotEntity);
      }
    });

    it('should transform addRecipeToSlot result to WeeklyPlanningSlotEntity with RecipeEntity recipes', async () => {
      mockWeeklyPlanningsService.addRecipeToSlot.mockResolvedValue(
        mockSlotFromService,
      );

      const result = await controller.addRecipeToSlot(userId, 1, 'MONDAY', 1, {
        recipeId: 5,
      });

      expect(result).toBeInstanceOf(WeeklyPlanningSlotEntity);
      result.recipes.forEach((recipe) => {
        expect(recipe).toBeInstanceOf(RecipeEntity);
      });
    });

    it('should transform all plannings to WeeklyPlanningEntity in findAll', async () => {
      const plannings = [mockWeeklyPlanning, { ...mockWeeklyPlanning, id: 2 }];
      mockWeeklyPlanningsService.findAll.mockResolvedValue(plannings);

      const result = await controller.findAll(userId);

      result.forEach((planning) => {
        expect(planning).toBeInstanceOf(WeeklyPlanningEntity);
      });
    });

    it('should transform updated planning to WeeklyPlanningEntity', async () => {
      const updatedPlanning = {
        ...mockWeeklyPlanning,
        slotsPerDay: 4,
      };
      mockWeeklyPlanningsService.update.mockResolvedValue(updatedPlanning);

      const result = await controller.update(userId, 1, { slotsPerDay: 4 });

      expect(result).toBeInstanceOf(WeeklyPlanningEntity);
    });
  });
});
