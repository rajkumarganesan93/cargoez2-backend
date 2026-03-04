import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCountryDto {
  @ApiProperty({ example: 'United States', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'US', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;
}
