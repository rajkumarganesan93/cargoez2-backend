import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Can edit content', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
