import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateAppCustomerDto {
  @ApiProperty({ description: 'Tenant UID' })
  @IsUUID()
  tenantUid: string;

  @ApiPropertyOptional({ description: 'Branch UID' })
  @IsOptional()
  @IsUUID()
  branchUid?: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Keycloak subject identifier' })
  @IsOptional()
  @IsString()
  keycloakSub?: string;

  @ApiPropertyOptional({ description: 'Password for local credential' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class UpdateAppCustomerDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Branch UID' })
  @IsOptional()
  @IsUUID()
  branchUid?: string;
}
