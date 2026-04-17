import { IsString } from 'class-validator';

export class SignInDto {
  @IsString()
  handle!: string;

  @IsString()
  password!: string;
}
