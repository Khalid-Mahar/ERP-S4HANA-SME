import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Approval Workflows')
@ApiBearerAuth('access-token')
@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post(':type/:id/submit')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Submit document for approval' })
  submit(@CurrentUser() user: any, @Param('type') type: 'SALES_ORDER' | 'PURCHASE_ORDER', @Param('id') id: string) {
    return this.approvalService.submitForApproval(user.companyId, user.id, type, id);
  }

  @Post(':type/:id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve document' })
  approve(@CurrentUser() user: any, @Param('type') type: 'SALES_ORDER' | 'PURCHASE_ORDER', @Param('id') id: string) {
    return this.approvalService.approveDocument(user.companyId, user.id, type, id);
  }

  @Post(':type/:id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject document' })
  reject(
    @CurrentUser() user: any, 
    @Param('type') type: 'SALES_ORDER' | 'PURCHASE_ORDER', 
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.approvalService.rejectDocument(user.companyId, user.id, type, id, reason);
  }
}
