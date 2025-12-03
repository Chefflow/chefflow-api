import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = await this.usersService.create(createUserDto);
    return new UserEntity(user);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: User): Promise<UserEntity> {
    return new UserEntity(user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<UserEntity[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => new UserEntity(user));
  }

  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('username') username: string): Promise<UserEntity> {
    const user = await this.usersService.findOne(username);
    return new UserEntity(user);
  }

  @Patch(':username')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('username') username: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserEntity> {
    if (currentUser.username !== username) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.usersService.update(username, updateUserDto);
    return new UserEntity(user);
  }

  @Delete(':username')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('username') username: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    if (currentUser.username !== username) {
      throw new ForbiddenException('You can only delete your own account');
    }

    await this.usersService.delete(username);
  }
}
