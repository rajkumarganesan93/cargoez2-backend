import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateAdminRoleDto {
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}

export class UpdateAdminRoleDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

export class AssignAdminRolePermissionDto {
  @ApiProperty() @IsUUID() adminRoleUid: string;
  @ApiProperty() @IsUUID() adminPermissionUid: string;
  @ApiPropertyOptional() @IsOptional() conditions?: Record<string, any>;
}

export class AssignSysAdminRoleDto {
  @ApiProperty() @IsUUID() sysAdminUid: string;
  @ApiProperty() @IsUUID() adminRoleUid: string;
}
