import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsEmail,
  IsNumber, IsArray, IsEnum, ValidateNested, Min, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '@prisma/client';

export class CreateVendorDto {
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) paymentTerms?: number;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}

export class PurchaseOrderLineDto {
  @ApiProperty() @IsUUID() itemId: string;
  @ApiProperty() @IsNumber() @Min(0.0001) @Type(() => Number) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitCost: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsUUID() vendorId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() vendorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ type: [PurchaseOrderLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines?: PurchaseOrderLineDto[];
}

export class GoodsReceiptDto {
  @ApiProperty() @IsUUID() warehouseId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus) status: PurchaseOrderStatus;
}
