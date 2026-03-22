import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Implements 3-Way Matching logic:
   * 1. PO exists and is confirmed.
   * 2. Goods have been received (GRN).
   * 3. Invoice quantity matches GRN quantity and price matches PO price.
   */
  async createVendorInvoice(companyId: string, poId: string, invoiceData: any) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: true, grns: { include: { purchaseOrder: true } } },
    });

    if (!po) throw new NotFoundException('Purchase Order not found');

    // 1. PO status check
    if (!['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status)) {
      throw new BadRequestException('PO must be confirmed or received to generate invoice');
    }

    // 2. Aggregate GRN quantities for this PO
    const receivedItems = await this.prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: { referenceType: 'PURCHASE_ORDER', referenceId: poId, movementType: 'IN' },
      _sum: { quantity: true },
    });

    const receivedMap = new Map(receivedItems.map(i => [i.itemId, Number(i._sum.quantity || 0)]));

    // 3. Match Invoice Lines with PO and GRN
    for (const invLine of invoiceData.lines) {
      const poLine = po.lines.find(l => l.itemId === invLine.itemId);
      if (!poLine) throw new BadRequestException(`Item ${invLine.itemId} not found in PO`);

      const receivedQty = receivedMap.get(invLine.itemId) || 0;
      if (invLine.quantity > receivedQty) {
        throw new BadRequestException(`Invoiced quantity (${invLine.quantity}) for item ${invLine.itemId} exceeds received quantity (${receivedQty})`);
      }

      if (Math.abs(Number(invLine.unitPrice) - Number(poLine.unitCost)) > 0.01) {
        throw new BadRequestException(`Invoice price (${invLine.unitPrice}) for item ${invLine.itemId} does not match PO price (${poLine.unitCost})`);
      }
    }

    // If matches, create invoice
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          referenceType: 'PURCHASE_ORDER',
          referenceId: poId,
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: new Date(invoiceData.invoiceDate),
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
          totalAmount: invoiceData.totalAmount,
          status: 'UNPAID',
          lines: {
            create: invoiceData.lines.map((l: any) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.quantity * l.unitPrice,
            })),
          },
        },
      });

      // Update PO status if fully invoiced (optional logic)
      
      return invoice;
    });
  }
}
