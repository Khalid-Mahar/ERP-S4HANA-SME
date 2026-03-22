// ── DTOs ──────────────────────────────────────────────────────────────────────
// warehouse/dto/warehouse.dto.ts  (inline for brevity — split in production)

import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-001' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'Main Warehouse' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  address?: string;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

export class CreateBinDto {
  @ApiProperty({ example: 'A-01-01' })
  @IsString() @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Aisle A, Row 1, Shelf 1' })
  @IsString() @IsNotEmpty()
  name: string;
}

export class StockTransferDto {
  @ApiProperty() @IsUUID() itemId: string;
  @ApiProperty() @IsUUID() fromWarehouseId: string;
  @ApiProperty() @IsUUID() toWarehouseId: string;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
