import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateRecipeStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  instruction!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;
}
