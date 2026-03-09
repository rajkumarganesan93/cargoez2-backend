import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  moduleId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  screenId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsUUID()
  operationId!: string;
}
