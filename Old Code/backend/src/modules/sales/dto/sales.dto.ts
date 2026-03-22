// ── sales/dto/sales.dto.ts ────────────────────────────────────────────────────
import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsEmail, IsNumber, IsArray,
  IsEnum, ValidateNested, Min, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SalesOrderStatus } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) code: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) creditLimit?: number;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class SalesOrderLineDto {
  @ApiProperty() @IsUUID() itemId: string;
  @ApiProperty() @IsNumber() @Min(0.0001) @Type(() => Number) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discount?: number;
}

export class CreateSalesOrderDto {
  @ApiProperty() @IsUUID() customerId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [SalesOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines: SalesOrderLineDto[];
}

export class UpdateSalesOrderStatusDto {
  @ApiProperty({ enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  status: SalesOrderStatus;
}
