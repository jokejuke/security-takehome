import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

class BioLinkDto {
  @IsString()
  @Length(1, 50)
  label!: string;

  @IsUrl({ require_tld: false })
  url!: string;
}

export class UpdateBioPageDto {
  @IsOptional()
  @IsString()
  @Length(2, 30)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'Handle must contain only lowercase letters, numbers, and hyphens',
  })
  handle?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 240)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => BioLinkDto)
  links?: BioLinkDto[];
}
