import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
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

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateProductDetailDto {
  @ApiProperty()
  @IsUUID()
  productUid: string;

  @ApiProperty()
  @IsString()
  detailKey: string;

  @ApiProperty()
  @IsString()
  detailValue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateProductDetailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detailValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
