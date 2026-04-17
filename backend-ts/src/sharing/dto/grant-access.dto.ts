import { IsString, IsArray, ArrayMinSize, IsIn } from 'class-validator';
import { GrantedField } from '../sharing.types';

export class GrantAccessDto {
  @IsString()
  sharedHandle!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['bio', 'display_name', 'links'], { each: true })
  grantedFields!: GrantedField[];
}
