import { IsOptional, IsString, IsUrl, Length, Matches, MinLength, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class BioLinkDto {
  @IsString()
  @Length(1, 50)
  label!: string;

  @IsUrl({ require_tld: false })
  url!: string;
}

export class SignUpDto {
  @IsString()
  @Length(2, 30)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Handle must contain only lowercase letters, numbers, and hyphens',
  })
  handle!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, { message: 'Password must contain at least one special character' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => BioLinkDto)
  links?: BioLinkDto[];
}
