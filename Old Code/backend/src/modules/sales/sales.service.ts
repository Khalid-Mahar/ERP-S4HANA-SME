import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateCustomerDto, UpdateCustomerDto,
  CreateSalesOrderDto, UpdateSalesOrderStatusDto,
} from './dto/sales.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
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
  async createSalesOrder(companyId: string, dto: CreateSalesOrderDto) {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Validate items and compute totals
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

    const taxAmount = 0; // Extend later with tax rules
    const totalAmount = subtotal + taxAmount;

    // Generate order number
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
        include: { lines: { include: { item: { select: { code: true, name: true } } } }, customer: true },
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
        lines: { include: { item: { select: { code: true, name: true, uom: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async updateOrderStatus(companyId: string, id: string, dto: UpdateSalesOrderStatusDto, defaultWarehouseId?: string) {
    const order = await this.findSalesOrderById(companyId, id);

    // Deduct inventory when order is shipped/delivered
    if (
      (dto.status === 'SHIPPED' || dto.status === 'DELIVERED') &&
      order.status === 'CONFIRMED' &&
      defaultWarehouseId
    ) {
      for (const line of order.lines) {
        await this.inventoryService.recordStockMovement(companyId, {
          itemId: line.itemId,
          fromWarehouseId: defaultWarehouseId,
          quantity: Number(line.quantity),
          movementType: 'OUT',
          referenceType: 'SALES_ORDER',
          referenceId: order.id,
        });
      }
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status },
    });
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

  private async generateOrderNumber(companyId: string, prefix: string): Promise<string> {
    const count = await this.prisma.salesOrder.count({ where: { companyId } });
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
