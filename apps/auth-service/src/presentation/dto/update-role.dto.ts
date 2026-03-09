import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ example: 'editor', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Can edit content', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
