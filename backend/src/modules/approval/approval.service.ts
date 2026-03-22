import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Submits a document for approval.
   */
  async submitForApproval(companyId: string, userId: string, resourceType: 'SALES_ORDER' | 'PURCHASE_ORDER', resourceId: string) {
    const statusField = resourceType === 'SALES_ORDER' ? 'SalesOrder' : 'PurchaseOrder';
    
    const doc = await (this.prisma[statusField as any] as any).findUnique({
      where: { id: resourceId },
    });

    if (!doc) throw new NotFoundException(`${resourceType} not found`);
    if (doc.status !== 'DRAFT') throw new BadRequestException(`Document must be in DRAFT status to submit for approval`);

    return (this.prisma[statusField as any] as any).update({
      where: { id: resourceId },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  /**
   * Approves a document.
   */
  async approveDocument(companyId: string, userId: string, resourceType: 'SALES_ORDER' | 'PURCHASE_ORDER', resourceId: string) {
    const statusField = resourceType === 'SALES_ORDER' ? 'SalesOrder' : 'PurchaseOrder';
    const approvedStatus = 'CONFIRMED';

    const doc = await (this.prisma[statusField as any] as any).findUnique({
      where: { id: resourceId },
    });

    if (!doc) throw new NotFoundException(`${resourceType} not found`);
    if (doc.status !== 'PENDING_APPROVAL') throw new BadRequestException(`Document is not pending approval`);

    return (this.prisma[statusField as any] as any).update({
      where: { id: resourceId },
      data: { 
        status: approvedStatus,
        approverId: userId,
        approvalDate: new Date(),
      },
    });
  }

  /**
   * Rejects a document.
   */
  async rejectDocument(companyId: string, userId: string, resourceType: 'SALES_ORDER' | 'PURCHASE_ORDER', resourceId: string, reason: string) {
    const statusField = resourceType === 'SALES_ORDER' ? 'SalesOrder' : 'PurchaseOrder';

    const doc = await (this.prisma[statusField as any] as any).findUnique({
      where: { id: resourceId },
    });

    if (!doc) throw new NotFoundException(`${resourceType} not found`);

    return (this.prisma[statusField as any] as any).update({
      where: { id: resourceId },
      data: { 
        status: 'DRAFT',
        notes: doc.notes ? `${doc.notes}\nRejected by ${userId}: ${reason}` : `Rejected: ${reason}`,
      },
    });
  }
}
