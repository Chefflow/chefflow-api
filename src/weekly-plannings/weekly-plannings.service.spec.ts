import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type {
  DayOfWeek,
  Recipe,
  WeeklyPlanning,
  WeeklyPlanningSlot,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { WeeklyPlanningsService } from './weekly-plannings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeeklyPlanningDto } from './dto/create-weekly-planning.dto';
import { UpdateWeeklyPlanningDto } from './dto/update-weekly-planning.dto';

describe('WeeklyPlanningsService', () => {
  let service: WeeklyPlanningsService;

  type MockWeeklyPlanning = WeeklyPlanning & {
    slots: Array<WeeklyPlanningSlot & { recipes: Array<{ recipe: Recipe }> }>;
  };

  type MockPrisma = {
    user: { findUniqueOrThrow: jest.Mock };
    recipe: { findUnique: jest.Mock };
    weeklyPlanning: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    weeklyPlanningSlot: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
    };
    weeklyPlanningSlotRecipe: {
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockPrismaService: MockPrisma = {
    user: {
      findUniqueOrThrow: jest.fn(),
    },
    recipe: {
      findUnique: jest.fn(),
    },
    weeklyPlanning: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    weeklyPlanningSlot: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    weeklyPlanningSlotRecipe: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(
      async <T>(callback: (tx: MockPrisma) => Promise<T>): Promise<T> =>
        callback(mockPrismaService),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyPlanningsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WeeklyPlanningsService>(WeeklyPlanningsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const userId = 1;
    const weekStart = new Date('2024-01-01');

    it('should snapshot User.slotsPerDay onto the new planning', async () => {
      // Arrange
      const createDto: CreateWeeklyPlanningDto = {
        weekStart,
      };
      const mockUser = { slotsPerDay: 5 };
      const mockPlanning = {
        id: 1,
        userId,
        weekStart,
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      };

      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrismaService.weeklyPlanning.create.mockResolvedValue(mockPlanning);

      // Act
      const result = await service.create(userId, createDto);

      // Assert
      expect(result.slotsPerDay).toBe(5);
      expect(mockPrismaService.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: userId },
        select: { slotsPerDay: true },
      });
      expect(mockPrismaService.weeklyPlanning.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            slotsPerDay: 5,
          }),
        }),
      );
    });

    it('should throw ConflictException on P2002 (week already exists)', async () => {
      // Arrange
      const createDto: CreateWeeklyPlanningDto = { weekStart };
      const mockUser = { slotsPerDay: 3 };
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0' },
      );

      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrismaService.weeklyPlanning.create.mockRejectedValue(p2002Error);

      // Act & Assert
      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const userId = 1;

    it('should return plannings for given userId ordered by weekStart desc', async () => {
      // Arrange
      const mockPlannings = [
        {
          id: 1,
          userId,
          weekStart: new Date('2024-01-08'),
          weekEnd: new Date('2024-01-14'),
          slotsPerDay: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId,
          weekStart: new Date('2024-01-01'),
          weekEnd: new Date('2024-01-07'),
          slotsPerDay: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.weeklyPlanning.findMany.mockResolvedValue(
        mockPlannings,
      );

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toEqual(mockPlannings);
      expect(mockPrismaService.weeklyPlanning.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { weekStart: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    const userId = 1;
    const planningId = 1;

    it('should return planning with flattened slots[].recipes ordered by position', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [
          {
            id: 1,
            weeklyPlanningId: planningId,
            dayOfWeek: 'MONDAY' as DayOfWeek,
            slotNumber: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            recipes: [
              {
                id: 1,
                slotId: 1,
                recipeId: 10,
                position: 1,
                addedAt: new Date(),
                recipe: { id: 10, userId, title: 'Recipe 1' },
              },
              {
                id: 2,
                slotId: 1,
                recipeId: 11,
                position: 2,
                addedAt: new Date(),
                recipe: { id: 11, userId, title: 'Recipe 2' },
              },
            ],
          },
        ],
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );

      // Act
      const result = await service.findOne(userId, planningId);

      // Assert
      expect(result.slots[0].recipes).toEqual([
        { id: 10, userId, title: 'Recipe 1' },
        { id: 11, userId, title: 'Recipe 2' },
      ]);
    });

    it('should throw NotFoundException when planning belongs to another user', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId: 999,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        slots: [],
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );

      // Act & Assert
      await expect(service.findOne(userId, planningId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when planning does not exist', async () => {
      // Arrange
      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(userId, planningId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const userId = 1;
    const planningId = 1;

    it('should update weekStart and recompute weekEnd', async () => {
      // Arrange
      const existingPlanning = {
        id: planningId,
        userId,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newWeekStart = new Date('2024-01-15');
      const updateDto: UpdateWeeklyPlanningDto = { weekStart: newWeekStart };
      const updatedPlanning: MockWeeklyPlanning = {
        ...existingPlanning,
        weekStart: newWeekStart,
        weekEnd: new Date('2024-01-21'),
        slots: [],
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        existingPlanning,
      );
      mockPrismaService.weeklyPlanning.update.mockResolvedValue(
        updatedPlanning,
      );

      // Act
      const result = await service.update(userId, planningId, updateDto);

      // Assert
      expect(result.weekStart).toEqual(newWeekStart);
      expect(result.weekEnd).toEqual(new Date('2024-01-21'));
    });

    it('should throw NotFoundException when planning belongs to another user', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId: 999,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateDto: UpdateWeeklyPlanningDto = {
        weekStart: new Date('2024-01-15'),
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );

      // Act & Assert
      await expect(
        service.update(userId, planningId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    const userId = 1;
    const planningId = 1;

    it('should delete planning when owned', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );
      mockPrismaService.weeklyPlanning.delete.mockResolvedValue(mockPlanning);

      // Act
      await service.delete(userId, planningId);

      // Assert
      expect(mockPrismaService.weeklyPlanning.delete).toHaveBeenCalledWith({
        where: { id: planningId },
      });
    });

    it('should throw NotFoundException when not owned', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId: 999,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );

      // Act & Assert
      await expect(service.delete(userId, planningId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addRecipeToSlot', () => {
    const userId = 1;
    const planningId = 1;
    const dayOfWeek: DayOfWeek = 'MONDAY';
    const slotNumber = 1;
    const recipeId = 10;

    it('should create slot and add first recipe with position=1', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };
      const mockRecipe = { id: recipeId, userId };
      const mockSlot = {
        id: 1,
        weeklyPlanningId: planningId,
        dayOfWeek,
        slotNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipes: [],
      };
      const slotWithRecipe = {
        ...mockSlot,
        recipes: [
          {
            id: 1,
            slotId: 1,
            recipeId,
            position: 1,
            addedAt: new Date(),
            recipe: mockRecipe,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            recipe: {
              findUnique: jest.fn().mockResolvedValue(mockRecipe),
            },
            weeklyPlanningSlot: {
              upsert: jest.fn().mockResolvedValue(mockSlot),
              findUniqueOrThrow: jest.fn().mockResolvedValue(slotWithRecipe),
            },
            weeklyPlanningSlotRecipe: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);

          return result as unknown;
        },
      );

      // Act
      const result = await service.addRecipeToSlot(
        userId,
        planningId,
        dayOfWeek,
        slotNumber,
        recipeId,
      );

      // Assert
      expect(result.recipes[0].position).toBe(1);
    });

    it('should add second recipe with position=max+1', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };
      const mockRecipe = { id: recipeId, userId };
      const mockSlot = {
        id: 1,
        weeklyPlanningId: planningId,
        dayOfWeek,
        slotNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipes: [
          {
            id: 1,
            slotId: 1,
            recipeId: 9,
            position: 1,
            addedAt: new Date(),
          },
        ],
      };
      const slotWithSecondRecipe = {
        ...mockSlot,
        recipes: [
          { ...mockSlot.recipes[0] },
          {
            id: 2,
            slotId: 1,
            recipeId,
            position: 2,
            addedAt: new Date(),
            recipe: mockRecipe,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            recipe: {
              findUnique: jest.fn().mockResolvedValue(mockRecipe),
            },
            weeklyPlanningSlot: {
              upsert: jest.fn().mockResolvedValue(mockSlot),
              findUniqueOrThrow: jest
                .fn()
                .mockResolvedValue(slotWithSecondRecipe),
            },
            weeklyPlanningSlotRecipe: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act
      const result = await service.addRecipeToSlot(
        userId,
        planningId,
        dayOfWeek,
        slotNumber,
        recipeId,
      );

      // Assert
      expect(result.recipes[1].position).toBe(2);
    });

    it('should throw NotFoundException when planning belongs to another user', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId: 999,
        slotsPerDay: 3,
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      await expect(
        service.addRecipeToSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException SLOT_OUT_OF_RANGE when slot > planning.slotsPerDay', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      try {
        await service.addRecipeToSlot(
          userId,
          planningId,
          dayOfWeek,
          5,
          recipeId,
        );
        fail('should throw BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          code?: string;
        };
        expect(response.code).toBe('SLOT_OUT_OF_RANGE');
      }
    });

    it('should throw NotFoundException when recipe belongs to another user', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };
      const mockRecipe = { id: recipeId, userId: 999 };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            recipe: {
              findUnique: jest.fn().mockResolvedValue(mockRecipe),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      await expect(
        service.addRecipeToSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException SLOT_FULL when slot has 5 recipes', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };
      const mockRecipe = { id: recipeId, userId };
      const mockSlot = {
        id: 1,
        weeklyPlanningId: planningId,
        dayOfWeek,
        slotNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipes: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          slotId: 1,
          recipeId: i + 100,
          position: i + 1,
          addedAt: new Date(),
        })),
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            recipe: {
              findUnique: jest.fn().mockResolvedValue(mockRecipe),
            },
            weeklyPlanningSlot: {
              upsert: jest.fn().mockResolvedValue(mockSlot),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      try {
        await service.addRecipeToSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        );
        fail('should throw BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as {
          code?: string;
        };
        expect(response.code).toBe('SLOT_FULL');
      }
    });

    it('should throw ConflictException RECIPE_DUPLICATE when recipe already in slot', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };
      const mockRecipe = { id: recipeId, userId };
      const mockSlot = {
        id: 1,
        weeklyPlanningId: planningId,
        dayOfWeek,
        slotNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipes: [
          {
            id: 1,
            slotId: 1,
            recipeId,
            position: 1,
            addedAt: new Date(),
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            recipe: {
              findUnique: jest.fn().mockResolvedValue(mockRecipe),
            },
            weeklyPlanningSlot: {
              upsert: jest.fn().mockResolvedValue(mockSlot),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      try {
        await service.addRecipeToSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        );
        fail('should throw ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const response = (error as ConflictException).getResponse() as {
          code?: string;
        };
        expect(response.code).toBe('RECIPE_DUPLICATE');
      }
    });

    it('should return slot with recipes ordered by position', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        slotsPerDay: 3,
      };
      const mockRecipe = { id: recipeId, userId };
      const mockSlot = {
        id: 1,
        weeklyPlanningId: planningId,
        dayOfWeek,
        slotNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
        recipes: [],
      };
      const slotWithRecipes = {
        ...mockSlot,
        recipes: [
          {
            id: 1,
            slotId: 1,
            recipeId: 11,
            position: 1,
            addedAt: new Date(),
            recipe: { id: 11, userId },
          },
          {
            id: 2,
            slotId: 1,
            recipeId: 10,
            position: 2,
            addedAt: new Date(),
            recipe: { id: 10, userId },
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            recipe: {
              findUnique: jest.fn().mockResolvedValue(mockRecipe),
            },
            weeklyPlanningSlot: {
              upsert: jest.fn().mockResolvedValue(mockSlot),
              findUniqueOrThrow: jest.fn().mockResolvedValue(slotWithRecipes),
            },
            weeklyPlanningSlotRecipe: {
              create: jest.fn().mockResolvedValue({}),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act
      const result = await service.addRecipeToSlot(
        userId,
        planningId,
        dayOfWeek,
        slotNumber,
        recipeId,
      );

      // Assert
      expect(result.recipes[0].position).toBe(1);
      expect(result.recipes[1].position).toBe(2);
    });
  });

  describe('removeRecipeFromSlot', () => {
    const userId = 1;
    const planningId = 1;
    const dayOfWeek: DayOfWeek = 'MONDAY';
    const slotNumber = 1;
    const recipeId = 10;

    it('should remove recipe from slot', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
      };
      const mockSlot = {
        id: 1,
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            weeklyPlanningSlot: {
              findUnique: jest.fn().mockResolvedValue(mockSlot),
            },
            weeklyPlanningSlotRecipe: {
              deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act
      await service.removeRecipeFromSlot(
        userId,
        planningId,
        dayOfWeek,
        slotNumber,
        recipeId,
      );

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when planning is not owned', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId: 999,
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      await expect(
        service.removeRecipeFromSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            weeklyPlanningSlot: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      await expect(
        service.removeRecipeFromSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when recipe is not in slot', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
      };
      const mockSlot = {
        id: 1,
      };

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            weeklyPlanningSlot: {
              findUnique: jest.fn().mockResolvedValue(mockSlot),
            },
            weeklyPlanningSlotRecipe: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act & Assert
      await expect(
        service.removeRecipeFromSlot(
          userId,
          planningId,
          dayOfWeek,
          slotNumber,
          recipeId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should keep slot row even when last recipe is removed', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
      };
      const mockSlot = {
        id: 1,
      };
      let deleteManyWasCalled = false;

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: unknown) => Promise<unknown>) => {
          // @ts-expect-error: Test mock with loose typing
          const result = callback({
            weeklyPlanning: {
              findUnique: jest.fn().mockResolvedValue(mockPlanning),
            },
            weeklyPlanningSlot: {
              findUnique: jest.fn().mockResolvedValue(mockSlot),
              delete: jest.fn(() => {
                throw new Error('Should not delete slot');
              }),
            },
            weeklyPlanningSlotRecipe: {
              deleteMany: jest.fn().mockImplementation(() => {
                deleteManyWasCalled = true;
                return { count: 1 };
              }),
            },
          } as unknown as Prisma.TransactionClient & MockPrisma);
          return result as unknown;
        },
      );

      // Act
      await service.removeRecipeFromSlot(
        userId,
        planningId,
        dayOfWeek,
        slotNumber,
        recipeId,
      );

      // Assert
      expect(deleteManyWasCalled).toBe(true);
    });
  });

  describe('deleteSlot', () => {
    const userId = 1;
    const planningId = 1;
    const dayOfWeek: DayOfWeek = 'MONDAY';
    const slotNumber = 1;

    it('should delete slot when owned', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockSlot = {
        id: 1,
        weeklyPlanningId: planningId,
        dayOfWeek,
        slotNumber,
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );
      mockPrismaService.weeklyPlanningSlot.findUnique.mockResolvedValue(
        mockSlot,
      );
      mockPrismaService.weeklyPlanningSlot.delete.mockResolvedValue(mockSlot);

      // Act
      await service.deleteSlot(userId, planningId, dayOfWeek, slotNumber);

      // Assert
      expect(mockPrismaService.weeklyPlanningSlot.delete).toHaveBeenCalledWith({
        where: {
          weeklyPlanningId_dayOfWeek_slotNumber: {
            weeklyPlanningId: planningId,
            dayOfWeek,
            slotNumber,
          },
        },
      });
    });

    it('should throw NotFoundException when slot does not exist', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );
      mockPrismaService.weeklyPlanningSlot.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteSlot(userId, planningId, dayOfWeek, slotNumber),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when planning is not owned', async () => {
      // Arrange
      const mockPlanning = {
        id: planningId,
        userId: 999,
        weekStart: new Date('2024-01-01'),
        weekEnd: new Date('2024-01-07'),
        slotsPerDay: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.weeklyPlanning.findUnique.mockResolvedValue(
        mockPlanning,
      );

      // Act & Assert
      await expect(
        service.deleteSlot(userId, planningId, dayOfWeek, slotNumber),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
