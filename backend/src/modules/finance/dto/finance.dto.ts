import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber,
  IsArray, ValidateNested, IsUUID, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ example: '1010' })
  @IsString() @IsNotEmpty() code: string;

  @ApiProperty({ example: 'Bank Account' })
  @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType) type: AccountType;

  @ApiPropertyOptional({ description: 'Parent account UUID for hierarchy' })
  @IsOptional() @IsUUID() parentId?: string;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}

export class TransactionLineDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() debitAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() creditAccountId?: string;

  @ApiProperty({ example: 1500.00 })
  @IsNumber() @Min(0.01) @Type(() => Number) amount: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() description?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ example: '2024-01-15' })
  @IsDateString() transactionDate: string;

  @ApiProperty({ example: 'Sales revenue from SO-2024-00001' })
  @IsString() @IsNotEmpty() description: string;

  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;

  @ApiProperty({ type: [TransactionLineDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => TransactionLineDto)
  lines: TransactionLineDto[];
}

export class FinancialReportDto {
  @ApiProperty({ example: '2024-01-01' }) @IsDateString() startDate: string;
  @ApiProperty({ example: '2024-12-31' }) @IsDateString() endDate: string;
}
