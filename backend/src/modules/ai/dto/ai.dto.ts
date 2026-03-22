import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiAnalysisDto {
  @ApiProperty({ example: 'Analyze sales trends for the last 3 months' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: any;
}

export class GenerateDescriptionDto {
  @ApiProperty({ example: 'Laptop Dell XPS 15' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;
}
