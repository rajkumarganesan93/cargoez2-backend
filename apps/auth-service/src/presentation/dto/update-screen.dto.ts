import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateScreenDto {
  @ApiProperty({ example: 'Item List', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'List of inventory items', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
