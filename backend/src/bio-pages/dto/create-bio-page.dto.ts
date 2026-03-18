import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  ValidateNested,
} from 'class-validator';

class BioLinkDto {
  @IsString()
  @Length(1, 50)
  label!: string;

  @IsUrl({ require_tld: false })
  url!: string;
}

export class CreateBioPageDto {
  @IsString()
  @Length(2, 30)
  handle!: string;

  @IsString()
  @Length(1, 80)
  displayName!: string;

  @IsString()
  @Length(1, 240)
  bio!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => BioLinkDto)
  links?: BioLinkDto[];
}
