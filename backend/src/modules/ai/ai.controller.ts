import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiAnalysisDto, GenerateDescriptionDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('AI Integration')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-description')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Generate professional product description using AI' })
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateItemDescription(dto.itemName, dto.category);
  }

  @Post('analyze-trends')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Analyze business data trends using AI' })
  analyzeTrends(@Body() dto: AiAnalysisDto) {
    return this.aiService.analyzeBusinessTrends(dto.prompt, dto.context);
  }
}
