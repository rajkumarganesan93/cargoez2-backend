import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignPermissionDto {
  @ApiProperty()
  @IsUUID()
  permissionUid: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class AssignRoleDto {
  @ApiProperty()
  @IsUUID()
  roleUid: string;
}
