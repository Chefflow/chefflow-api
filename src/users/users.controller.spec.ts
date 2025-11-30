import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = {
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    image: null,
    provider: 'LOCAL' as const,
    providerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAnotherUser = {
    username: 'anotheruser',
    email: 'another@example.com',
    name: 'Another User',
    password: 'hashedPassword',
    image: null,
    provider: 'LOCAL' as const,
    providerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'NewPass1234!',
      name: 'New User',
    };

    it('should create a new user', async () => {
      const newUser = { ...mockUser, ...createUserDto };
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await controller.create(createUserDto);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.username).toBe('newuser');
      expect(result.email).toBe('new@example.com');
    });
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const result = await controller.getMe(mockUser);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('should work with different authenticated users', async () => {
      const result = await controller.getMe(mockAnotherUser);

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.username).toBe('anotheruser');
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [mockUser, mockAnotherUser];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserEntity);
      expect(result[1]).toBeInstanceOf(UserEntity);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by username', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('testuser');

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.username).toBe('testuser');
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      username: 'testuser',
      name: 'Updated Name',
    };

    it('should allow user to update own profile', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        'testuser',
        updateUserDto,
        mockUser,
      );

      expect(result).toBeInstanceOf(UserEntity);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw ForbiddenException when user tries to update another profile', async () => {
      await expect(
        controller.update('anotheruser', updateUserDto, mockUser),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.update('anotheruser', updateUserDto, mockUser),
      ).rejects.toThrow('You can only update your own profile');
    });

    it('should not call service when updating another user profile', async () => {
      const updateSpy = jest.spyOn(usersService, 'update');

      try {
        await controller.update('anotheruser', updateUserDto, mockUser);
      } catch (error) {}

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should allow update when username in path matches current user', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        'testuser',
        updateUserDto,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(mockUsersService.update).toHaveBeenCalledWith(updateUserDto);
    });
  });

  describe('remove', () => {
    it('should allow user to delete own account', async () => {
      mockUsersService.delete.mockResolvedValue(mockUser);

      await controller.remove('testuser', mockUser);

      expect(mockUsersService.delete).toHaveBeenCalledWith('testuser');
    });

    it('should throw ForbiddenException when user tries to delete another account', async () => {
      await expect(controller.remove('anotheruser', mockUser)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(controller.remove('anotheruser', mockUser)).rejects.toThrow(
        'You can only delete your own account',
      );
    });

    it('should not call service when deleting another user account', async () => {
      const deleteSpy = jest.spyOn(usersService, 'delete');

      try {
        await controller.remove('anotheruser', mockUser);
      } catch (error) {}

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should allow deletion when username matches current user', async () => {
      mockUsersService.delete.mockResolvedValue(mockUser);

      await controller.remove('testuser', mockUser);

      expect(mockUsersService.delete).toHaveBeenCalledWith('testuser');
    });
  });

  describe('Authorization edge cases', () => {
    const updateDto: UpdateUserDto = {
      username: 'testuser',
      name: 'New Name',
    };

    it('should handle case-sensitive username comparison in update', async () => {
      await expect(
        controller.update('TestUser', updateDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle case-sensitive username comparison in delete', async () => {
      await expect(controller.remove('TestUser', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow update with exact username match', async () => {
      const updatedUser = { ...mockUser, name: 'New Name' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('testuser', updateDto, mockUser);

      expect(result).toBeDefined();
    });

    it('should allow delete with exact username match', async () => {
      mockUsersService.delete.mockResolvedValue(mockUser);

      await expect(
        controller.remove('testuser', mockUser),
      ).resolves.not.toThrow();
    });
  });
});
