import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: {
    companyId: string;
    userId?: string;
    action: string;
    module: string;
    resourceId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          companyId: params.companyId,
          userId: params.userId,
          action: params.action,
          module: params.module,
          resourceId: params.resourceId,
          oldValue: params.oldValue,
          newValue: params.newValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error.stack);
    }
  }
}
