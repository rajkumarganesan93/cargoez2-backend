import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ example: 'United States' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @MaxLength(10)
  code!: string;
}
