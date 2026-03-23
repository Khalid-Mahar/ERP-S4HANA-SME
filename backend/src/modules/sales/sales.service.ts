import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateCustomerDto, UpdateCustomerDto,
  CreateSalesOrderDto, ShipSalesOrderDto, UpdateSalesOrderDto, UpdateSalesOrderStatusDto,
} from './dto/sales.dto';
import { AuditService } from '../audit/audit.service';
import { CostingService } from '../inventory/costing.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
    private costingService: CostingService,
  ) {}

  // ── Customers ──────────────────────────────────────────────────
  async createCustomer(companyId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { companyId_code: { companyId, code: dto.code.toUpperCase() } },
    });
    if (existing) throw new ConflictException('Customer code already exists');
    return this.prisma.customer.create({ data: { ...dto, code: dto.code.toUpperCase(), companyId } });
  }

  async findAllCustomers(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { code: { contains: pagination.search, mode: 'insensitive' } },
        { name: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return new PaginatedResult(customers, total, pagination);
  }

  async findCustomerById(companyId: string, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: { salesOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  async updateCustomer(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.findCustomerById(companyId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  // ── Sales Orders ───────────────────────────────────────────────
  async createSalesOrder(companyId: string, userId: string, dto: CreateSalesOrderDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException('Customer not found');

    let subtotal = 0;
    const lineData: any[] = [];

    for (const line of dto.lines) {
      const item = await this.prisma.item.findFirst({ where: { id: line.itemId, companyId, isActive: true } });
      if (!item) throw new NotFoundException(`Item '${line.itemId}' not found`);

      const discountFactor = 1 - (line.discount || 0) / 100;
      const lineTotal = line.quantity * line.unitPrice * discountFactor;
      subtotal += lineTotal;
      lineData.push({ ...line, lineTotal, discount: line.discount || 0 });
    }

    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;
    const orderNumber = await this.generateOrderNumber(companyId, 'SO');

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.create({
        data: {
          companyId,
          customerId: dto.customerId,
          orderNumber,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          notes: dto.notes,
          subtotal,
          taxAmount,
          totalAmount,
          lines: { create: lineData },
        },
        include: { lines: { include: { item: { select: { sku: true, name: true } } } }, customer: true },
      });

      await this.auditService.log({
        companyId,
        userId,
        action: 'CREATE',
        module: 'SALES',
        resourceId: order.id,
        newValue: order,
      });

      this.logger.log(`Sales order created: ${orderNumber}`);
      return order;
    });
  }

  async findAllSalesOrders(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { orderNumber: { contains: pagination.search, mode: 'insensitive' } },
        { customer: { name: { contains: pagination.search, mode: 'insensitive' } } },
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
      this.prisma.salesOrder.findMany({
        where, skip: pagination.skip, take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { code: true, name: true } }, _count: { select: { lines: true } } },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return new PaginatedResult(orders, total, pagination);
  }

  async findSalesOrderById(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        lines: { include: { item: { select: { sku: true, name: true, uom: true } } } },
        reservations: true,
        shipments: {
          orderBy: { shippedAt: 'desc' },
          take: 10,
          include: { lines: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async updateSalesOrder(companyId: string, userId: string, id: string, dto: UpdateSalesOrderDto) {
    const existing = await this.findSalesOrderById(companyId, id);
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot edit sales order in status ${existing.status}`);
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (['CONFIRMED', 'PICKING'].includes(existing.status)) {
        await this.releaseReservationsTx(tx, companyId, existing.id);
      }

      let subtotal = Number(existing.subtotal || 0);
      let taxAmount = Number(existing.taxAmount || 0);
      let totalAmount = Number(existing.totalAmount || 0);
      let lineData: any[] | undefined;

      if (dto.lines) {
        subtotal = 0;
        lineData = [];
        for (const line of dto.lines) {
          const item = await tx.item.findFirst({ where: { id: line.itemId, companyId, isActive: true } });
          if (!item) throw new NotFoundException(`Item '${line.itemId}' not found`);

          const discountFactor = 1 - (line.discount || 0) / 100;
          const lineTotal = line.quantity * line.unitPrice * discountFactor;
          subtotal += lineTotal;
          lineData.push({ ...line, lineTotal, discount: line.discount || 0 });
        }
        taxAmount = 0;
        totalAmount = subtotal + taxAmount;
      }

      const updated = await tx.salesOrder.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
          notes: dto.notes,
          subtotal,
          taxAmount,
          totalAmount,
          lines: dto.lines ? { deleteMany: {}, create: lineData! } : undefined,
        },
        include: { customer: true, lines: true },
      });

      if (['CONFIRMED', 'PICKING'].includes(existing.status)) {
        await this.reserveStockTx(tx, companyId, dto.warehouseId, updated);
      }

      await this.auditService.log({
        companyId,
        userId,
        action: 'UPDATE',
        module: 'SALES',
        resourceId: id,
        oldValue: { status: existing.status },
        newValue: { status: existing.status, edited: true },
      });

      return updated;
    });
  }

  async shipSalesOrder(companyId: string, userId: string, id: string, dto: ShipSalesOrderDto) {
    const lowStockEvents: Array<{
      companyId: string;
      itemId: string;
      warehouseId: string;
      availableQty: number;
      minStockLevel: number;
      source: string;
    }> = [];
    const result = await this.prisma.$transaction((tx) =>
      this.shipSalesOrderTx(tx, companyId, userId, id, dto, false, lowStockEvents),
    );

    this.eventEmitter.emit('sales.shipment.created', {
      companyId,
      orderId: id,
      shipmentId: result.shipment.id,
      userId,
    });
    for (const e of lowStockEvents) this.eventEmitter.emit('inventory.low_stock', e);

    return result;
  }

  async updateOrderStatus(companyId: string, userId: string, id: string, dto: UpdateSalesOrderStatusDto) {
    const order = await this.findSalesOrderById(companyId, id);
    const oldStatus = order.status;

    this.assertStatusTransition(oldStatus, dto.status);

    if (dto.status === 'SHIPPED') {
      const lowStockEvents: Array<{
        companyId: string;
        itemId: string;
        warehouseId: string;
        availableQty: number;
        minStockLevel: number;
        source: string;
      }> = [];

      const result = await this.prisma.$transaction((tx) =>
        this.shipSalesOrderTx(tx, companyId, userId, id, { notes: dto.notes }, true, lowStockEvents),
      );

      this.eventEmitter.emit('sales.order.shipped', { companyId, orderId: id, userId });
      this.eventEmitter.emit('sales.shipment.created', { companyId, orderId: id, shipmentId: result.shipment.id, userId });
      for (const e of lowStockEvents) this.eventEmitter.emit('inventory.low_stock', e);

      return result.order;
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id },
        data: { status: dto.status },
      });

      if (dto.status === 'CONFIRMED' && (oldStatus === 'DRAFT' || oldStatus === 'PENDING_APPROVAL')) {
        await this.reserveStockTx(tx, companyId, dto.warehouseId, order);
      }

      if (dto.status === 'CANCELLED' && ['CONFIRMED', 'PICKING', 'PARTIALLY_SHIPPED'].includes(oldStatus)) {
        await this.releaseReservationsTx(tx, companyId, order.id);
      }

      await this.auditService.log({
        companyId,
        userId,
        action: 'UPDATE_STATUS',
        module: 'SALES',
        resourceId: id,
        oldValue: { status: oldStatus },
        newValue: { status: dto.status, warehouseId: dto.warehouseId },
      });

      return updated;
    });

    if (dto.status === 'CONFIRMED' && (oldStatus === 'DRAFT' || oldStatus === 'PENDING_APPROVAL')) {
      this.eventEmitter.emit('sales.order.confirmed', { companyId, orderId: id, userId, warehouseId: dto.warehouseId });
    }

    return updatedOrder;
  }

  async getSalesSummary(companyId: string) {
    const [totalOrders, totalRevenue, pending] = await Promise.all([
      this.prisma.salesOrder.count({ where: { companyId } }),
      this.prisma.salesOrder.aggregate({
        where: { companyId, status: { in: ['DELIVERED', 'SHIPPED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.salesOrder.count({ where: { companyId, status: { in: ['DRAFT', 'CONFIRMED'] } } }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingOrders: pending,
    };
  }

  async getSalesReturnsKPI(companyId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await this.prisma.salesOrder.aggregate({
      where: { companyId, status: { in: ['SHIPPED', 'DELIVERED'] }, createdAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true }
    });

    return { value: sales._sum.totalAmount || 0 };
  }

  async getTopProducts(companyId: string) {
    const products = await this.prisma.salesOrderLine.groupBy({
      by: ['itemId'],
      where: { salesOrder: { companyId } },
      _sum: { lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5
    });

    const detailedProducts = await Promise.all(products.map(async p => {
      const item = await this.prisma.item.findUnique({ where: { id: p.itemId }, select: { name: true } });
      return { name: item?.name, value: p._sum.lineTotal };
    }));

    return detailedProducts;
  }

  async getMonthlyRevenue(companyId: string, months = 6) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        companyId,
        status: { in: ['SHIPPED', 'DELIVERED'] },
        createdAt: { gte: start },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const buckets: Array<{ key: string; month: string; revenue: number; orders: number }> = [];
    const map = new Map<string, { revenue: number; orders: number }>();

    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { revenue: 0, orders: 0 });
      buckets.push({ key, month: d.toLocaleString('en-US', { month: 'short' }), revenue: 0, orders: 0 });
    }

    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = map.get(key);
      if (!b) continue;
      b.revenue += Number(o.totalAmount);
      b.orders += 1;
    }

    return buckets.map((b) => {
      const v = map.get(b.key) || { revenue: 0, orders: 0 };
      return { month: b.month, revenue: v.revenue, orders: v.orders };
    });
  }

  private async generateOrderNumber(companyId: string, prefix: string): Promise<string> {
    const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `${prefix}-${Date.now()}-${rand}`;
  }

  private assertStatusTransition(from: string, to: string) {
    if (from === to) return;
    const allowed: Record<string, string[]> = {
      DRAFT: ['CONFIRMED', 'CANCELLED', 'PENDING_APPROVAL'],
      PENDING_APPROVAL: ['CONFIRMED', 'CANCELLED', 'DRAFT'],
      CONFIRMED: ['SHIPPED', 'PARTIALLY_SHIPPED', 'CANCELLED', 'PICKING'],
      PICKING: ['SHIPPED', 'CANCELLED'],
      PARTIALLY_SHIPPED: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };
    const ok = allowed[from]?.includes(to) ?? false;
    if (!ok) throw new BadRequestException(`Invalid status transition: ${from} -> ${to}`);
  }

  private async generateShipmentNumber(companyId: string): Promise<string> {
    const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `SHIP-${Date.now()}-${rand}`;
  }

  private buildShipAllRequest(order: any, reserved: any[]) {
    const byLine = new Map<string, number>();
    for (const r of reserved) {
      byLine.set(r.salesOrderLineId, (byLine.get(r.salesOrderLineId) || 0) + Number(r.quantity));
    }
    return Array.from(byLine.entries()).map(([salesOrderLineId, quantity]) => ({ salesOrderLineId, quantity }));
  }

  private async shipSalesOrderTx(
    tx: any,
    companyId: string,
    userId: string,
    salesOrderId: string,
    dto: ShipSalesOrderDto,
    requireComplete: boolean,
    lowStockEvents: Array<{ companyId: string; itemId: string; warehouseId: string; availableQty: number; minStockLevel: number; source: string }>,
  ) {
    const order = await tx.salesOrder.findFirst({
      where: { id: salesOrderId, companyId },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    if (!['CONFIRMED', 'PICKING', 'PARTIALLY_SHIPPED'].includes(order.status)) {
      throw new BadRequestException(`Invalid status to ship: ${order.status}`);
    }

    const date = new Date();
    const period = await tx.postingPeriod.findFirst({
      where: {
        companyId,
        startDate: { lte: date },
        endDate: { gte: date },
        isClosed: false,
      },
    });
    if (!period) throw new BadRequestException('No open posting period found for shipment date');

    const shipmentNumber = await this.generateShipmentNumber(companyId);
    const shipment = await tx.salesShipment.create({
      data: {
        companyId,
        salesOrderId: order.id,
        shipmentNumber,
        notes: dto.notes,
      },
    });

    const reserved = await tx.stockReservation.findMany({
      where: { companyId, salesOrderId: order.id, status: 'RESERVED' },
      orderBy: { createdAt: 'asc' },
    });

    const requested = dto.lines?.length
      ? dto.lines.map((l) => ({ salesOrderLineId: l.salesOrderLineId, quantity: Number(l.quantity) }))
      : this.buildShipAllRequest(order, reserved);

    const lineMap = new Map<string, any>();
    for (const l of order.lines) lineMap.set(l.id, l);

    const shipRequests = requested.filter((x) => x.quantity > 0);
    if (!shipRequests.length) throw new BadRequestException('Nothing to ship');

    const shippedLines: Array<{ amount: number; cogs: number }> = [];

    for (const req of shipRequests) {
      const soLine = lineMap.get(req.salesOrderLineId);
      if (!soLine) throw new BadRequestException('Invalid salesOrderLineId');

      const availableReserved = reserved
        .filter((r) => r.salesOrderLineId === req.salesOrderLineId)
        .reduce((s, r) => s + Number(r.quantity), 0);

      if (availableReserved + 0.0001 < req.quantity) {
        throw new BadRequestException('Requested ship quantity exceeds reserved quantity');
      }

      let remaining = req.quantity;
      for (const r of reserved) {
        if (remaining <= 0) break;
        if (r.salesOrderLineId !== req.salesOrderLineId) continue;
        const rQty = Number(r.quantity);
        if (rQty <= 0) continue;

        const take = Math.min(remaining, rQty);
        const level = await tx.stockLevel.findFirst({ where: { itemId: r.itemId, warehouseId: r.warehouseId } });
        if (!level) throw new BadRequestException(`Stock level not found for item ${r.itemId}`);
        if (Number(level.reservedQty) + 0.0001 < take) throw new BadRequestException(`Reserved stock insufficient for item ${r.itemId}`);
        if (Number(level.quantity) + 0.0001 < take) throw new BadRequestException(`Stock quantity insufficient for item ${r.itemId}`);

        const calculatedCost = await this.costingService.calculateFIFOCost(tx, companyId, r.itemId, take);
        const unitCost = take > 0 ? calculatedCost / take : 0;

        await tx.stockMovement.create({
          data: {
            companyId,
            itemId: r.itemId,
            fromWarehouseId: r.warehouseId,
            quantity: take,
            unitCost,
            movementType: 'OUT',
            referenceType: 'SALES_SHIPMENT',
            referenceId: shipment.id,
            notes: dto.notes,
          },
        });

        const updatedLevel = await tx.stockLevel.update({
          where: { id: level.id },
          data: { reservedQty: { decrement: take }, quantity: { decrement: take } },
        });

        if (take === rQty) {
          await tx.stockReservation.update({ where: { id: r.id }, data: { status: 'SHIPPED' } });
        } else {
          await tx.stockReservation.update({ where: { id: r.id }, data: { quantity: { decrement: take } } });
          await tx.stockReservation.create({
            data: {
              companyId,
              salesOrderId: r.salesOrderId,
              salesOrderLineId: r.salesOrderLineId,
              itemId: r.itemId,
              warehouseId: r.warehouseId,
              quantity: take,
              status: 'SHIPPED',
            },
          });
        }

        const discountFactor = 1 - Number(soLine.discount || 0) / 100;
        const lineTotal = Number(take) * Number(soLine.unitPrice) * discountFactor;

        await tx.salesShipmentLine.create({
          data: {
            salesShipmentId: shipment.id,
            salesOrderLineId: soLine.id,
            itemId: r.itemId,
            warehouseId: r.warehouseId,
            quantity: take,
            unitPrice: soLine.unitPrice,
            discount: soLine.discount || 0,
            lineTotal,
            unitCost,
          },
        });

        const item = await tx.item.findFirst({
          where: { id: r.itemId, companyId },
          select: { minStockLevel: true },
        });
        const minStockLevel = Number(item?.minStockLevel || 0);
        const availableQty = Number(updatedLevel.quantity) - Number(updatedLevel.reservedQty);
        if (availableQty < minStockLevel) {
          lowStockEvents.push({
            companyId,
            itemId: r.itemId,
            warehouseId: r.warehouseId,
            availableQty,
            minStockLevel,
            source: `SALES_SHIPMENT:${shipmentNumber}`,
          });
        }

        shippedLines.push({ amount: lineTotal, cogs: calculatedCost });
        remaining -= take;
      }
    }

    const shippedAmount = shippedLines.reduce((s, l) => s + l.amount, 0);
    const shippedCogs = shippedLines.reduce((s, l) => s + l.cogs, 0);

    await this.postSalesShipmentToFinanceTx(tx, companyId, period.id, shipment, shippedAmount, shippedCogs);

    const shippedByLine = await tx.stockReservation.groupBy({
      by: ['salesOrderLineId'],
      where: { companyId, salesOrderId: order.id, status: 'SHIPPED' },
      _sum: { quantity: true },
    });
    const shippedMap = new Map<string, number>();
    for (const r of shippedByLine) shippedMap.set(r.salesOrderLineId, Number(r._sum.quantity || 0));

    const fullyShipped = order.lines.every((l: any) => (shippedMap.get(l.id) || 0) + 0.0001 >= Number(l.quantity));
    const newStatus = fullyShipped ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
    if (requireComplete && newStatus !== 'SHIPPED') {
      throw new BadRequestException('Order is not fully shipped');
    }

    const updatedOrder = await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: newStatus },
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'SHIP',
      module: 'SALES',
      resourceId: order.id,
      oldValue: { status: order.status },
      newValue: { status: updatedOrder.status, shipmentNumber },
    });

    return { shipment, order: updatedOrder, shippedAmount, shippedCogs };
  }

  private async reserveStockTx(tx: any, companyId: string, preferredWarehouseId: string | undefined, order: any) {
    await this.releaseReservationsTx(tx, companyId, order.id);

    if (preferredWarehouseId) {
      const wh = await tx.warehouse.findFirst({ where: { id: preferredWarehouseId, companyId } });
      if (!wh) throw new BadRequestException('Warehouse not found');
    }

    for (const line of order.lines) {
      const qtyNeeded = Number(line.quantity);
      if (qtyNeeded <= 0) continue;

      const levels = await tx.stockLevel.findMany({
        where: {
          itemId: line.itemId,
          warehouse: { companyId },
        },
        select: { id: true, warehouseId: true, quantity: true, reservedQty: true },
      });

      const candidates = levels
        .map((l: any) => ({
          id: l.id,
          warehouseId: l.warehouseId,
          available: Number(l.quantity) - Number(l.reservedQty),
        }))
        .filter((c: any) => c.available > 0);

      candidates.sort((a: any, b: any) => b.available - a.available);

      if (preferredWarehouseId) {
        candidates.sort((a: any, b: any) => {
          if (a.warehouseId === preferredWarehouseId && b.warehouseId !== preferredWarehouseId) return -1;
          if (b.warehouseId === preferredWarehouseId && a.warehouseId !== preferredWarehouseId) return 1;
          return b.available - a.available;
        });
      }

      let remaining = qtyNeeded;
      for (const c of candidates) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, c.available);
        if (take <= 0) continue;

        await tx.stockLevel.update({
          where: { id: c.id },
          data: { reservedQty: { increment: take } },
        });

        await tx.stockReservation.create({
          data: {
            companyId,
            salesOrderId: order.id,
            salesOrderLineId: line.id,
            itemId: line.itemId,
            warehouseId: c.warehouseId,
            quantity: take,
            status: 'RESERVED',
          },
        });

        remaining -= take;
      }

      if (remaining > 0) {
        throw new BadRequestException(`Insufficient available stock for item ${line.itemId}`);
      }
    }
  }

  private async postSalesShipmentToFinanceTx(
    tx: any,
    companyId: string,
    postingPeriodId: string,
    shipment: any,
    salesAmount: number,
    totalCogs: number,
  ) {
    const [ar, revenue, inventory, cogs] = await Promise.all([
      tx.account.findFirst({ where: { companyId, code: '1100' } }),
      tx.account.findFirst({ where: { companyId, code: '4000' } }),
      tx.account.findFirst({ where: { companyId, code: '1200' } }),
      tx.account.findFirst({ where: { companyId, code: '5000' } }),
    ]);
    if (!ar || !revenue || !inventory || !cogs) {
      throw new BadRequestException('Required finance accounts not found (1100, 4000, 1200, 5000)');
    }

    const lines: any[] = [
      { debitAccountId: ar.id, amount: salesAmount },
      { creditAccountId: revenue.id, amount: salesAmount },
    ];

    if (totalCogs > 0) {
      lines.push({ debitAccountId: cogs.id, amount: totalCogs });
      lines.push({ creditAccountId: inventory.id, amount: totalCogs });
    }

    const totalDebits = lines.reduce((s: number, l: any) => s + (l.debitAccountId ? Number(l.amount) : 0), 0);
    const totalCredits = lines.reduce((s: number, l: any) => s + (l.creditAccountId ? Number(l.amount) : 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException('Finance posting not balanced');
    }

    await tx.transaction.create({
      data: {
        companyId,
        postingPeriodId,
        transactionDate: new Date(),
        description: `Auto-post Sales Shipment ${shipment.shipmentNumber}`,
        referenceType: 'SALES_SHIPMENT',
        referenceId: shipment.id,
        totalAmount: salesAmount,
        status: 'POSTED',
        lines: { create: lines },
      },
    });
  }

  private async releaseReservationsTx(tx: any, companyId: string, salesOrderId: string) {
    const reservations = await tx.stockReservation.findMany({
      where: { companyId, salesOrderId, status: 'RESERVED' },
      select: { id: true, itemId: true, warehouseId: true, quantity: true },
    });

    for (const r of reservations) {
      const qty = Number(r.quantity);
      if (qty <= 0) continue;
      const level = await tx.stockLevel.findFirst({ where: { itemId: r.itemId, warehouseId: r.warehouseId } });
      if (!level) continue;

      await tx.stockLevel.update({
        where: { id: level.id },
        data: { reservedQty: { decrement: qty } },
      });

      await tx.stockReservation.update({
        where: { id: r.id },
        data: { status: 'RELEASED' },
      });
    }
  }

  private async postSalesToFinanceTx(tx: any, companyId: string, order: any) {
    return order;
  }
}
