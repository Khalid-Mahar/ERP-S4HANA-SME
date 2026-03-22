import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsEmail, IsNumber, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LeadStatus, InteractionType } from '@prisma/client';

export class CreateLeadDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) value?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}

export class CreateInteractionDto {
  @ApiPropertyOptional() @IsOptional() customerId?: string;
  @ApiPropertyOptional() @IsOptional() leadId?: string;
  @ApiProperty({ enum: InteractionType }) @IsEnum(InteractionType) type: InteractionType;
  @ApiProperty() @IsString() @IsNotEmpty() subject: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
