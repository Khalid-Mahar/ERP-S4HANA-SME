import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  period?: 'day' | 'month' | 'year';

  @IsOptional()
  @IsString()
  accountId?: string;

  get skip(): number {
    return ((this.page || 1) - 1) * (this.pageSize || 20);
  }

  get take(): number {
    return this.pageSize || 20;
  }
}

export class PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };

  constructor(data: T[], total: number, pagination: PaginationDto) {
    this.data = data;
    this.meta = {
      total,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 20,
      totalPages: Math.ceil(total / (pagination.pageSize || 20)),
    };
  }
}
