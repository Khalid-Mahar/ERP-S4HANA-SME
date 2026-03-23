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

export class UpdateSalesOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() deliveryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ type: [SalesOrderLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines?: SalesOrderLineDto[];

  @ApiPropertyOptional({ description: 'Optional preferred warehouse for re-reservation' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class ShipSalesOrderLineDto {
  @ApiProperty() @IsUUID() salesOrderLineId: string;
  @ApiProperty() @IsNumber() @Min(0.0001) @Type(() => Number) quantity: number;
}

export class ShipSalesOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ type: [ShipSalesOrderLineDto], description: 'If omitted, ships all remaining reserved quantities' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipSalesOrderLineDto)
  lines?: ShipSalesOrderLineDto[];
}

export class UpdateSalesOrderStatusDto {
  @ApiProperty({ enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  status: SalesOrderStatus;

  @ApiPropertyOptional({ description: 'Optional: preferred warehouse for reservation' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
