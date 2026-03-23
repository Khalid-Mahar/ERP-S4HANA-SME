import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateVendorDto, UpdateVendorDto,
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto, GoodsReceiptDto, UpdatePurchaseOrderStatusDto,
} from './dto/purchase.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createVendor(companyId: string, dto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({
      where: { companyId_code: { companyId, code: dto.code.toUpperCase() } },
    });
    if (existing) throw new ConflictException('Vendor code already exists');
    return this.prisma.vendor.create({ data: { ...dto, code: dto.code.toUpperCase(), companyId } });
  }

  async findAllVendors(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { code: { contains: pagination.search, mode: 'insensitive' } },
        { name: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.vendor.count({ where }),
    ]);
    return new PaginatedResult(vendors, total, pagination);
  }

  async findVendorById(companyId: string, id: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, companyId } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async updateVendor(companyId: string, id: string, dto: UpdateVendorDto) {
    await this.findVendorById(companyId, id);
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async createPurchaseOrder(companyId: string, dto: CreatePurchaseOrderDto) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    let subtotal = 0;
    const lineData: any[] = [];

    for (const line of dto.lines) {
      const item = await this.prisma.item.findFirst({ where: { id: line.itemId, companyId, isActive: true } });
      if (!item) throw new NotFoundException(`Item '${line.itemId}' not found`);
      const lineTotal = line.quantity * line.unitCost;
      subtotal += lineTotal;
      lineData.push({ ...line, lineTotal });
    }

    const orderNumber = await this.generatePONumber(companyId);

    return this.prisma.purchaseOrder.create({
      data: {
        companyId,
        vendorId: dto.vendorId,
        orderNumber,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        subtotal,
        totalAmount: subtotal,
        lines: { create: lineData },
      },
      include: { lines: { include: { item: { select: { sku: true, name: true } } } }, vendor: true },
    });
  }

  async findAllPurchaseOrders(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { orderNumber: { contains: pagination.search, mode: 'insensitive' } },
        { vendor: { name: { contains: pagination.search, mode: 'insensitive' } } },
      ];
    }

    if (pagination.startDate || pagination.endDate) {
      where.createdAt = {};
      if (pagination.startDate) where.createdAt.gte = new Date(pagination.startDate);
      if (pagination.endDate) where.createdAt.lte = new Date(pagination.endDate);
    }

    if (pagination.period) {
      const now = new Date();
      const start = new Date();
      if (pagination.period === 'day') start.setHours(0, 0, 0, 0);
      else if (pagination.period === 'month') start.setDate(1);
      else if (pagination.period === 'year') { start.setMonth(0); start.setDate(1); }
      where.createdAt = { gte: start, lte: now };
    }

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip: pagination.skip, take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { code: true, name: true } } },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return new PaginatedResult(orders, total, pagination);
  }

  async findPurchaseOrderById(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        vendor: true,
        lines: { include: { item: { select: { sku: true, name: true, uom: true } } } },
        grns: true,
      },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async updatePurchaseOrder(companyId: string, userId: string, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.findPurchaseOrderById(companyId, id);
    if (['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot edit purchase order in status ${existing.status}`);
    }

    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, companyId } });
      if (!vendor) throw new NotFoundException('Vendor not found');
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotal = Number(existing.subtotal || 0);
      let totalAmount = Number(existing.totalAmount || 0);
      let lineData: any[] | undefined;

      if (dto.lines) {
        subtotal = 0;
        lineData = [];
        for (const line of dto.lines) {
          const item = await tx.item.findFirst({ where: { id: line.itemId, companyId, isActive: true } });
          if (!item) throw new NotFoundException(`Item '${line.itemId}' not found`);
          const lineTotal = line.quantity * line.unitCost;
          subtotal += lineTotal;
          lineData.push({ ...line, lineTotal, receivedQty: 0 });
        }
        totalAmount = subtotal;
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: dto.vendorId,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
          notes: dto.notes,
          subtotal,
          totalAmount,
          lines: dto.lines ? { deleteMany: {}, create: lineData! } : undefined,
        },
        include: { vendor: true, lines: true },
      });

      await this.auditService.log({
        companyId,
        userId,
        action: 'UPDATE',
        module: 'PURCHASE',
        resourceId: id,
        oldValue: { status: existing.status },
        newValue: { status: existing.status, edited: true },
      });

      return updated;
    });
  }

  async getPendingPosKpi(companyId: string) {
    const value = await this.prisma.purchaseOrder.count({
      where: {
        companyId,
        status: { in: ['DRAFT', 'PENDING_APPROVAL', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'] },
      },
    });
    return { value };
  }

  async updateOrderStatus(companyId: string, userId: string, id: string, dto: UpdatePurchaseOrderStatusDto) {
    const order = await this.findPurchaseOrderById(companyId, id);
    const from = order.status;
    const to = dto.status;
    if (from === to) return order;

    const allowed: Record<string, string[]> = {
      DRAFT: ['PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED'],
      PENDING_APPROVAL: ['CONFIRMED', 'CANCELLED', 'DRAFT'],
      SENT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
      RECEIVED: [],
      CANCELLED: [],
    };
    const ok = allowed[from]?.includes(to) ?? false;
    if (!ok) throw new BadRequestException(`Invalid PO status transition: ${from} -> ${to}`);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: to },
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'UPDATE_STATUS',
      module: 'PURCHASE',
      resourceId: id,
      oldValue: { status: from },
      newValue: { status: to },
    });

    return updated;
  }

  private async generatePONumber(companyId: string): Promise<string> {
    const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `PO-${Date.now()}-${rand}`;
  }

  async receiveGoods(companyId: string, userId: string, poId: string, dto: GoodsReceiptDto) {
    const order = await this.findPurchaseOrderById(companyId, poId);

    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      throw new ConflictException(`Order is already ${order.status}`);
    }

    if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new BadRequestException(`Invalid status to receive goods: ${order.status}`);
    }

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const grnNumber = `GRN-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const date = new Date();
      const period = await tx.postingPeriod.findFirst({
        where: {
          companyId,
          startDate: { lte: date },
          endDate: { gte: date },
          isClosed: false,
        },
      });
      if (!period) throw new BadRequestException('No open posting period found for goods receipt date');

      const grn = await tx.goodsReceipt.create({
        data: {
          purchaseOrderId: poId,
          grnNumber,
          warehouseId: dto.warehouseId,
          notes: dto.notes,
        },
      });

      for (const line of order.lines) {
        const qty = Number(line.quantity);

        await tx.stockMovement.create({
          data: {
            companyId,
            itemId: line.itemId,
            toWarehouseId: dto.warehouseId,
            quantity: qty,
            unitCost: Number(line.unitCost),
            movementType: 'IN',
            referenceType: 'PURCHASE_ORDER',
            referenceId: order.id,
            notes: dto.notes,
          },
        });

        await this.upsertStockLevelTx(tx, line.itemId, dto.warehouseId, qty);

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQty: { increment: qty } },
        });
      }

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED' },
      });

      await this.postPurchaseToFinanceTx(tx, companyId, period.id, updatedOrder);

      await this.auditService.log({
        companyId,
        userId,
        action: 'RECEIVE_GOODS',
        module: 'PURCHASE',
        resourceId: poId,
        oldValue: { status: order.status },
        newValue: { status: 'RECEIVED', grnNumber, warehouseId: dto.warehouseId },
      });

      this.logger.log(`GRN created: ${grnNumber} for PO: ${order.orderNumber}`);
      return grn;
    });
  }

  private async upsertStockLevelTx(tx: any, itemId: string, warehouseId: string, qty: number) {
    const existing = await tx.stockLevel.findFirst({ where: { itemId, warehouseId } });
    if (existing) {
      return tx.stockLevel.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
      });
    }
    return tx.stockLevel.create({ data: { itemId, warehouseId, quantity: qty } });
  }

  private async postPurchaseToFinanceTx(tx: any, companyId: string, postingPeriodId: string, po: any) {
    const [inventory, ap] = await Promise.all([
      tx.account.findFirst({ where: { companyId, code: '1200' } }),
      tx.account.findFirst({ where: { companyId, code: '2000' } }),
    ]);
    if (!inventory || !ap) {
      throw new BadRequestException('Required finance accounts not found (1200, 2000)');
    }

    const amount = Number(po.totalAmount);
    const lines = [
      { debitAccountId: inventory.id, amount },
      { creditAccountId: ap.id, amount },
    ];

    await tx.transaction.create({
      data: {
        companyId,
        postingPeriodId,
        transactionDate: new Date(),
        description: `Auto-post Purchase Order ${po.orderNumber} RECEIVED`,
        referenceType: 'PURCHASE_ORDER',
        referenceId: po.id,
        totalAmount: amount,
        status: 'POSTED',
        lines: { create: lines },
      },
    });
  }
}
