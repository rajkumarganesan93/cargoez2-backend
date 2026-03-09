import { IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AbacConditions } from '../../domain/entities/role-permission.entity';

export class AssignPermissionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  permissionId!: string;

  @ApiProperty({
    example: { tenant_isolation: true, ownership_only: false },
    required: false,
    description: 'ABAC conditions (tenant_isolation, ownership_only, department, max_amount, time_window, custom_rules)',
  })
  @IsOptional()
  @IsObject()
  conditions?: AbacConditions | null;
}
