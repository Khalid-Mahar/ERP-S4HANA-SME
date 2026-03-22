import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateLeadDto, UpdateLeadDto, CreateInteractionDto } from './dto/crm.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('CRM')
@ApiBearerAuth('access-token')
@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('leads')
  create(@CurrentUser() user: any, @Body() dto: CreateLeadDto) {
    return this.crmService.createLead(user.companyId, dto);
  }

  @Get('leads')
  findAll(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.crmService.findAllLeads(user.companyId, p);
  }

  @Get('leads/pipeline')
  @ApiOperation({ summary: 'Get leads grouped by status (pipeline view)' })
  getPipeline(@CurrentUser() user: any) {
    return this.crmService.getLeadsPipeline(user.companyId);
  }

  @Get('leads/:id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.crmService.findLeadById(user.companyId, id);
  }

  @Put('leads/:id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.crmService.updateLead(user.companyId, id, dto);
  }

  @Post('interactions')
  @ApiOperation({ summary: 'Log a customer or lead interaction' })
  createInteraction(@CurrentUser() user: any, @Body() dto: CreateInteractionDto) {
    return this.crmService.createInteraction(dto);
  }

  @Get('interactions')
  getInteractions(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.crmService.getInteractions(user.companyId, p);
  }
}
