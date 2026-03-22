import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiAnalysisDto, GenerateDescriptionDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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

  @Get('insights')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get AI-driven business insights' })
  getInsights(
    @CurrentUser() user: any,
    @Query('module') module: string,
    @Body() context: any
  ) {
    return this.aiService.getBusinessInsights(user.companyId, module, context);
  }
}
