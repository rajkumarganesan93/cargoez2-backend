import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateModuleDto {
  @ApiProperty({ example: 'Inventory Management', required: false })
  @IsOptional()
  @IsString()
  name?: string;

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

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
