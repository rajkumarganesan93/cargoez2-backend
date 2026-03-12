import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantTypeUid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  countryUid?: string;

  @ApiPropertyOptional({ default: 'shared' })
  @IsOptional()
  @IsString()
  dbStrategy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantTypeUid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  countryUid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
