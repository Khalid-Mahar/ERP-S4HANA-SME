import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsDateString, IsNumber, IsEmail, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EmployeeStatus, AttendanceStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-001' }) @IsString() @IsNotEmpty() employeeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiProperty() @IsDateString() hireDate: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) salary?: number;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
}

export class RecordAttendanceDto {
  @ApiProperty({ example: '2024-01-15' }) @IsDateString() date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() checkOut?: string;
  @ApiPropertyOptional({ enum: AttendanceStatus }) @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
