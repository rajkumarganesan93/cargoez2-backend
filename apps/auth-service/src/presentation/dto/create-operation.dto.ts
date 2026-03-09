import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOperationDto {
  @ApiProperty({ example: 'archive' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Archive' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Archive records', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
