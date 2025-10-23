import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
    };

    const createdUser = {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: null,
      name: 'Test User',
      image: null,
      provider: 'LOCAL',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a user successfully', async () => {
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when username already exists', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.16.1',
          meta: { target: ['username'] },
        },
      );

      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('User with this username already exists'),
      );

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: createUserDto,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.16.1',
          meta: { target: ['email'] },
        },
      );

      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('User with this email already exists'),
      );
    });

    it('should throw ConflictException with generic message when target is undefined', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.16.1',
          meta: { target: undefined },
        },
      );

      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('User with this field already exists'),
      );
    });

    it('should throw InternalServerErrorException for unknown Prisma errors', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Some other error',
        {
          code: 'P2003',
          clientVersion: '6.16.1',
        },
      );

      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new InternalServerErrorException('Failed to create user'),
      );
    });

    it('should throw InternalServerErrorException for generic errors', async () => {
      const genericError = new Error('Database connection failed');

      mockPrismaService.user.create.mockRejectedValue(genericError);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new InternalServerErrorException('Failed to create user'),
      );
    });

    it('should create user with OAuth provider data', async () => {
      const oauthUserDto: CreateUserDto = {
        username: 'googleuser',
        email: 'user@gmail.com',
        name: 'Google User',
        provider: 'GOOGLE',
        providerId: 'google-123',
      };

      const oauthUser = {
        ...oauthUserDto,
        passwordHash: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(oauthUser);

      const result = await service.create(oauthUserDto);

      expect(result).toEqual(oauthUser);
      expect(result.provider).toBe('GOOGLE');
      expect(result.providerId).toBe('google-123');
    });

    it('should create user with passwordHash', async () => {
      const userWithPassword: CreateUserDto = {
        username: 'secureuser',
        email: 'secure@example.com',
        passwordHash: 'hashed_password_123',
      };

      const createdUserWithPassword = {
        ...userWithPassword,
        name: null,
        image: null,
        provider: 'LOCAL',
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(createdUserWithPassword);

      const result = await service.create(userWithPassword);

      expect(result.passwordHash).toBe('hashed_password_123');
    });
  });
});
