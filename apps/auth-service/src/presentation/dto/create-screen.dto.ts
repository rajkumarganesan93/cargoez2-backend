import { IsString, IsOptional, IsInt, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScreenDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  moduleId!: string;

  @ApiProperty({ example: 'item-list' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Item List' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'List of inventory items', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
