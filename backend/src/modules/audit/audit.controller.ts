import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get('recent')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CFO, Role.SALES_MANAGER, Role.WAREHOUSE_HEAD, Role.HR_MANAGER)
  @ApiOperation({ summary: 'Recent activities for dashboards' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async recent(@CurrentUser() user: any, @Query('limit') limit?: string) {
    const take = limit ? Math.min(Math.max(Number(limit), 1), 20) : 8;
    const rows = await this.prisma.auditLog.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        action: true,
        module: true,
        resourceId: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return rows;
  }
}

