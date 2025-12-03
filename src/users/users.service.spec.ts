import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

  describe('findAll', () => {
    const mockUsers = [
      {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hash123',
        name: 'User One',
        image: null,
        provider: 'LOCAL',
        providerId: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
      {
        id: 2,
        username: 'user2',
        email: 'user2@example.com',
        passwordHash: 'hash456',
        name: 'User Two',
        image: 'https://example.com/avatar.jpg',
        provider: 'GOOGLE',
        providerId: 'google-123',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      },
    ];

    it('should return all users successfully', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith();
    });

    it('should return empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException when database fails', async () => {
      const databaseError = new Error('Database connection failed');

      mockPrismaService.user.findMany.mockRejectedValue(databaseError);

      await expect(service.findAll()).rejects.toThrow(
        new InternalServerErrorException('Failed to fetch users'),
      );

      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return users with different providers', async () => {
      const mixedUsers = [
        {
          id: 1,
          username: 'localuser',
          email: 'local@example.com',
          passwordHash: 'hash123',
          name: 'Local User',
          image: null,
          provider: 'LOCAL',
          providerId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          username: 'googleuser',
          email: 'google@example.com',
          passwordHash: null,
          name: 'Google User',
          image: 'https://example.com/avatar.jpg',
          provider: 'GOOGLE',
          providerId: 'google-456',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mixedUsers);

      const result = await service.findAll();

      expect(result).toEqual(mixedUsers);
      expect(result[0].provider).toBe('LOCAL');
      expect(result[1].provider).toBe('GOOGLE');
      expect(result[1].providerId).toBe('google-456');
    });

    it('should return users with null optional fields', async () => {
      const userWithNulls = [
        {
          id: 1,
          username: 'minimaluser',
          email: 'minimal@example.com',
          passwordHash: null,
          name: null,
          image: null,
          provider: 'LOCAL',
          providerId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(userWithNulls);

      const result = await service.findAll();

      expect(result).toEqual(userWithNulls);
      expect(result[0].name).toBeNull();
      expect(result[0].image).toBeNull();
      expect(result[0].passwordHash).toBeNull();
    });
  });

  describe('findOne', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hash123',
      name: 'Test User',
      image: null,
      provider: 'LOCAL',
      providerId: null,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    it('should return a user when found by username', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('testuser');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'nonexistent' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException when database fails', async () => {
      const databaseError = new Error('Database connection failed');

      mockPrismaService.user.findUnique.mockRejectedValue(databaseError);

      await expect(service.findOne('testuser')).rejects.toThrow(
        new InternalServerErrorException('Failed to fetch user'),
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should find user with OAuth provider data', async () => {
      const oauthUser = {
        id: 2,
        username: 'googleuser',
        email: 'user@gmail.com',
        passwordHash: null,
        name: 'Google User',
        image: 'https://example.com/avatar.jpg',
        provider: 'GOOGLE',
        providerId: 'google-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(oauthUser);

      const result = await service.findOne('googleuser');

      expect(result).toEqual(oauthUser);
      expect(result.provider).toBe('GOOGLE');
      expect(result.providerId).toBe('google-123');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'googleuser' },
      });
    });

    it('should find user with null optional fields', async () => {
      const userWithNulls = {
        id: 3,
        username: 'minimaluser',
        email: 'minimal@example.com',
        passwordHash: null,
        name: null,
        image: null,
        provider: 'LOCAL',
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithNulls);

      const result = await service.findOne('minimaluser');

      expect(result).toEqual(userWithNulls);
      expect(result.name).toBeNull();
      expect(result.image).toBeNull();
      expect(result.passwordHash).toBeNull();
    });

    it('should handle empty username parameter', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('')).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: '' },
      });
    });
  });

  describe('update', () => {
    it('should update an existing user successfully', async () => {
      const username = 'user1';
      const updateUserDto = {
        email: 'updated1@example.com',
        name: 'Updated User One',
        image: 'https://example.com/newavatar.jpg',
      };

      const existingUser = {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hash123',
        name: 'User One',
        image: null,
        provider: 'LOCAL',
        providerId: null,
        hashedRefreshToken: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const updatedUser = {
        ...existingUser,
        ...updateUserDto,
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(username, updateUserDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { username },
        data: updateUserDto,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const username = 'nonexistentuser';
      const updateUserDto = {
        email: 'nonexistent@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update(username, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username },
      });
    });

    it('should throw InternalServerErrorException if update fails', async () => {
      const username = 'user1';
      const updateUserDto = {
        email: 'updatefail@example.com',
      };

      const existingUser = {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
        passwordHash: 'hash123',
        name: 'User One',
        image: null,
        provider: 'LOCAL',
        providerId: null,
        hashedRefreshToken: null,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockRejectedValue(
        new Error('Database update error'),
      );

      await expect(service.update(username, updateUserDto)).rejects.toThrow(
        'Failed to update user',
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { username },
        data: updateUserDto,
      });
    });
  });

  describe('delete', () => {
    const username = 'testuser';

    it('should delete a user successfully', async () => {
      mockPrismaService.user.delete.mockResolvedValue(undefined);

      await service.delete(username);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { username },
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        {
          code: 'P2025',
          clientVersion: '6.16.1',
        },
      );

      mockPrismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.delete(username)).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { username },
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException for unknown Prisma errors', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '6.16.1',
        },
      );

      mockPrismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.delete(username)).rejects.toThrow(
        new InternalServerErrorException('Failed to delete user'),
      );

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { username },
      });
    });

    it('should throw InternalServerErrorException for generic errors', async () => {
      const genericError = new Error('Database connection failed');

      mockPrismaService.user.delete.mockRejectedValue(genericError);

      await expect(service.delete(username)).rejects.toThrow(
        new InternalServerErrorException('Failed to delete user'),
      );

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { username },
      });
    });

    it('should handle empty username parameter', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record to delete does not exist',
        {
          code: 'P2025',
          clientVersion: '6.16.1',
        },
      );

      mockPrismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.delete('')).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { username: '' },
      });
    });
  });
});
