import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateLeadDto, UpdateLeadDto, CreateInteractionDto } from './dto/crm.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyId } from '../../common/decorators';

@ApiTags('CRM')
@ApiBearerAuth('access-token')
@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('leads')
  create(@CompanyId() cid: string, @Body() dto: CreateLeadDto) {
    return this.crmService.createLead(cid, dto);
  }

  @Get('leads')
  findAll(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.crmService.findAllLeads(cid, p);
  }

  @Get('leads/pipeline')
  @ApiOperation({ summary: 'Get leads grouped by status (pipeline view)' })
  getPipeline(@CompanyId() cid: string) {
    return this.crmService.getLeadsPipeline(cid);
  }

  @Get('leads/:id')
  findOne(@CompanyId() cid: string, @Param('id') id: string) {
    return this.crmService.findLeadById(cid, id);
  }

  @Put('leads/:id')
  update(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.crmService.updateLead(cid, id, dto);
  }

  @Post('interactions')
  @ApiOperation({ summary: 'Log a customer or lead interaction' })
  createInteraction(@CompanyId() cid: string, @Body() dto: CreateInteractionDto) {
    return this.crmService.createInteraction(cid, dto);
  }

  @Get('interactions')
  getInteractions(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.crmService.getInteractions(cid, p);
  }
}
