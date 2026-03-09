import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModuleDto {
  @ApiProperty({ example: 'inventory' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Inventory Management' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Manage inventory items', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'box', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
