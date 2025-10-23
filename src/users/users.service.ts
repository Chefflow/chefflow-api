import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: createUserDto,
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          const field = target?.[0] || 'field';
          throw new ConflictException(`User with this ${field} already exists`);
        }
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany();
      return users;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findOne(username: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username: username },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async update(updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: updateUserDto.username },
    });
    if (!user) throw new NotFoundException('User not found');
    try {
      const updatedUser = await this.prisma.user.update({
        where: { username: updateUserDto.username },
        data: updateUserDto,
      });
      return updatedUser;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update user');
    }
  }
}
