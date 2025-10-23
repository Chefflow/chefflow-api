import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/health', () => {
    it('should return health status', () => {
      const result = appController.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('/ready', () => {
    it('should return ready status when database is connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await appController.getReadiness();

      expect(result).toEqual({
        status: 'ready',
        database: 'connected',
        timestamp: expect.any(String),
      });
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException when database is disconnected', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(appController.getReadiness()).rejects.toThrow();
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
