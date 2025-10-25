import { AuthProvider } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class UserEntity {
  username!: string;
  email!: string;

  @Exclude()
  password?: string | null;

  @Exclude()
  passwordHash?: string | null;

  name?: string | null;
  image?: string | null;
  provider!: AuthProvider;
  providerId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
