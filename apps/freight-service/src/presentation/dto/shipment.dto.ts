import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() shipmentNumber!: string;
  @ApiProperty() @IsString() @IsNotEmpty() origin!: string;
  @ApiProperty() @IsString() @IsNotEmpty() destination!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() shipperName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() consigneeName?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() weight?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() weightUnit?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() pieces?: number;
  @ApiPropertyOptional() @IsDateString() @IsOptional() etd?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() eta?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string;
}

export class UpdateShipmentDto {
  @ApiPropertyOptional() @IsString() @IsOptional() origin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() destination?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() mode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() shipperName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() consigneeName?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() weight?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() weightUnit?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() pieces?: number;
  @ApiPropertyOptional() @IsDateString() @IsOptional() etd?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() eta?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string;
}
