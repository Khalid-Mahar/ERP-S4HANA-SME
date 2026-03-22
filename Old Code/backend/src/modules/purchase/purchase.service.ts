import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateVendorDto, UpdateVendorDto,
  CreatePurchaseOrderDto, GoodsReceiptDto,
} from './dto/purchase.dto';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
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
      include: { lines: { include: { item: { select: { code: true, name: true } } } }, vendor: true },
    });
  }

  async findAllPurchaseOrders(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
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
        lines: { include: { item: { select: { code: true, name: true, uom: true } } } },
        grns: true,
      },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  // GRN - Goods Receipt: receives items into warehouse and updates stock
  async receiveGoods(companyId: string, poId: string, dto: GoodsReceiptDto) {
    const order = await this.findPurchaseOrderById(companyId, poId);

    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      throw new ConflictException(`Order is already ${order.status}`);
    }

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const grnNumber = `GRN-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      // Record GRN
      const grn = await tx.goodsReceipt.create({
        data: {
          purchaseOrderId: poId,
          grnNumber,
          warehouseId: dto.warehouseId,
          notes: dto.notes,
        },
      });

      // Increase stock for each line
      for (const line of order.lines) {
        await this.inventoryService.recordStockMovement(companyId, {
          itemId: line.itemId,
          toWarehouseId: dto.warehouseId,
          quantity: Number(line.quantity),
          movementType: 'IN',
          referenceType: 'PURCHASE_ORDER',
          referenceId: order.id,
        });

        // Update received qty
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { receivedQty: { increment: Number(line.quantity) } },
        });
      }

      // Update order status
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: 'RECEIVED' },
      });

      this.logger.log(`GRN created: ${grnNumber} for PO: ${order.orderNumber}`);
      return grn;
    });
  }

  private async generatePONumber(companyId: string): Promise<string> {
    const count = await this.prisma.purchaseOrder.count({ where: { companyId } });
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
}
