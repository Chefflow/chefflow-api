import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message:
      'Password must be a valid SHA-256 hash (64 hexadecimal characters)',
  })
  password!: string;
}
