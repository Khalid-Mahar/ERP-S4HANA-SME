import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateItemDto,
  UpdateItemDto,
  StockMovementDto,
  AdjustStockDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  // ── Items CRUD ─────────────────────────────────────────────────

  async createItem(companyId: string, dto: CreateItemDto) {
    const existing = await this.prisma.item.findUnique({
      where: { companyId_sku: { companyId, sku: dto.sku.toUpperCase() } },
    });
    if (existing) {
      throw new ConflictException(`Item SKU '${dto.sku}' already exists`);
    }

    return this.prisma.item.create({
      data: {
        ...dto,
        sku: dto.sku.toUpperCase(),
        companyId,
      },
    });
  }

  async findAllItems(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };

    if (pagination.search) {
      where.OR = [
        { sku: { contains: pagination.search, mode: 'insensitive' } },
        { name: { contains: pagination.search, mode: 'insensitive' } },
        { category: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const orderBy = pagination.sortBy
      ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
      : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          stockLevels: {
            include: { warehouse: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.item.count({ where }),
    ]);

    return new PaginatedResult(items, total, pagination);
  }

  async findItemById(companyId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, companyId },
      include: {
        stockLevels: {
          include: {
            warehouse: { select: { id: true, code: true, name: true } },
            binLocation: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!item) throw new NotFoundException(`Item '${id}' not found`);
    return item;
  }

  async updateItem(companyId: string, id: string, dto: UpdateItemDto) {
    await this.findItemById(companyId, id);

    if (dto.sku) {
      const duplicate = await this.prisma.item.findFirst({
        where: {
          companyId,
          sku: dto.sku.toUpperCase(),
          NOT: { id },
        },
      });
      if (duplicate) throw new ConflictException(`Item SKU '${dto.sku}' already in use`);
    }

    return this.prisma.item.update({
      where: { id },
      data: { ...dto, sku: dto.sku ? dto.sku.toUpperCase() : undefined },
    });
  }

  async deleteItem(companyId: string, id: string) {
    await this.findItemById(companyId, id);

    const movementCount = await this.prisma.stockMovement.count({ where: { itemId: id } });
    if (movementCount > 0) {
      throw new BadRequestException(
        'Cannot delete item with existing stock movements. Deactivate it instead.',
      );
    }

    await this.prisma.item.delete({ where: { id } });
    return { message: 'Item deleted successfully' };
  }

  // ── Stock Management ───────────────────────────────────────────

  async recordStockMovement(companyId: string, dto: StockMovementDto) {
    const item = await this.prisma.item.findFirst({ where: { id: dto.itemId, companyId } });
    if (!item) throw new NotFoundException('Item not found');

    if (dto.fromWarehouseId) {
      const wh = await this.prisma.warehouse.findFirst({
        where: { id: dto.fromWarehouseId, companyId },
      });
      if (!wh) throw new NotFoundException('Source warehouse not found');
    }

    if (dto.toWarehouseId) {
      const wh = await this.prisma.warehouse.findFirst({
        where: { id: dto.toWarehouseId, companyId },
      });
      if (!wh) throw new NotFoundException('Destination warehouse not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({ data: { ...dto } });

      if (dto.movementType === 'IN' && dto.toWarehouseId) {
        await this.upsertStockLevel(tx, dto.itemId, dto.toWarehouseId, dto.quantity);
      } else if (dto.movementType === 'OUT' && dto.fromWarehouseId) {
        await this.deductStockLevel(tx, dto.itemId, dto.fromWarehouseId, dto.quantity);
      } else if (dto.movementType === 'TRANSFER') {
        if (!dto.fromWarehouseId || !dto.toWarehouseId) {
          throw new BadRequestException('Transfer requires both source and destination warehouse');
        }
        await this.deductStockLevel(tx, dto.itemId, dto.fromWarehouseId, dto.quantity);
        await this.upsertStockLevel(tx, dto.itemId, dto.toWarehouseId, dto.quantity);
      } else if (dto.movementType === 'ADJUSTMENT' && dto.toWarehouseId) {
        await this.upsertStockLevel(tx, dto.itemId, dto.toWarehouseId, dto.quantity);
      }

      return movement;
    });
  }

  async adjustStock(companyId: string, itemId: string, dto: AdjustStockDto) {
    const item = await this.prisma.item.findFirst({ where: { id: itemId, companyId } });
    if (!item) throw new NotFoundException('Item not found');

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.stockLevel.findFirst({
        where: { itemId, warehouseId: dto.warehouseId },
      });
      const currentQty = Number(current?.quantity || 0);
      const diff = dto.quantity - currentQty;
      const movementType = diff >= 0 ? 'IN' : 'OUT';

      await tx.stockMovement.create({
        data: {
          itemId,
          toWarehouseId: diff >= 0 ? dto.warehouseId : undefined,
          fromWarehouseId: diff < 0 ? dto.warehouseId : undefined,
          quantity: Math.abs(diff),
          movementType,
          referenceType: 'ADJUSTMENT',
          notes: dto.notes || `Stock adjusted to ${dto.quantity}`,
        },
      });

      return tx.stockLevel.upsert({
        where: {
          itemId_warehouseId: {
            itemId,
            warehouseId: dto.warehouseId,
          },
        },
        update: { quantity: dto.quantity },
        create: {
          itemId,
          warehouseId: dto.warehouseId,
          quantity: dto.quantity,
        },
      });
    });
  }

  async getStockLevels(companyId: string, itemId?: string, warehouseId?: string) {
    const where: any = {};

    if (itemId) {
      const item = await this.prisma.item.findFirst({ where: { id: itemId, companyId } });
      if (!item) throw new NotFoundException('Item not found');
      where.itemId = itemId;
    }

    if (warehouseId) {
      const wh = await this.prisma.warehouse.findFirst({ where: { id: warehouseId, companyId } });
      if (!wh) throw new NotFoundException('Warehouse not found');
      where.warehouseId = warehouseId;
    }

    if (!itemId) {
      where.item = { companyId };
    }

    return this.prisma.stockLevel.findMany({
      where,
      include: {
        item: { select: { id: true, sku: true, name: true, uom: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async getStockMovements(companyId: string, pagination: PaginationDto, itemId?: string) {
    const where: any = { item: { companyId } };
    if (itemId) where.itemId = itemId;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { sku: true, name: true } },
          fromWarehouse: { select: { code: true, name: true } },
          toWarehouse: { select: { code: true, name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return new PaginatedResult(movements, total, pagination);
  }

  async getLowStockItems(companyId: string) {
    const items = await this.prisma.item.findMany({
      where: { companyId, isActive: true },
      include: { stockLevels: true },
    });

    return items
      .map((item) => {
        const totalStock = item.stockLevels.reduce(
          (sum, sl) => sum + Number(sl.quantity),
          0,
        );
        return { ...item, totalStock };
      })
      .filter((item) => item.totalStock <= item.minStockLevel);
  }

  // ── Private helpers ────────────────────────────────────────────

  private async upsertStockLevel(
    tx: any,
    itemId: string,
    warehouseId: string,
    quantity: number,
  ) {
    const existing = await tx.stockLevel.findFirst({ where: { itemId, warehouseId } });

    if (existing) {
      return tx.stockLevel.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    }

    return tx.stockLevel.create({
      data: { itemId, warehouseId, quantity },
    });
  }

  private async deductStockLevel(
    tx: any,
    itemId: string,
    warehouseId: string,
    quantity: number,
  ) {
    const level = await tx.stockLevel.findFirst({ where: { itemId, warehouseId } });

    if (!level || Number(level.quantity) < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    return tx.stockLevel.update({
      where: { id: level.id },
      data: { quantity: { decrement: quantity } },
    });
  }
}
