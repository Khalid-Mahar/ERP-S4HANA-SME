import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateBinDto, StockTransferDto } from './dto/warehouse.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class WarehouseService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  async createWarehouse(companyId: string, dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({
      where: { companyId_code: { companyId, code: dto.code.toUpperCase() } },
    });
    if (existing) throw new ConflictException(`Warehouse code '${dto.code}' already exists`);

    return this.prisma.warehouse.create({
      data: { ...dto, code: dto.code.toUpperCase(), companyId },
    });
  }

  async findAll(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.OR = [
        { code: { contains: pagination.search, mode: 'insensitive' } },
        { name: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where, skip: pagination.skip, take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { bins: true, _count: { select: { stockLevels: true } } },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return new PaginatedResult(warehouses, total, pagination);
  }

  async findOne(companyId: string, id: string) {
    const wh = await this.prisma.warehouse.findFirst({
      where: { id, companyId },
      include: {
        bins: true,
        stockLevels: {
          include: { item: { select: { code: true, name: true, uom: true } } },
        },
      },
    });
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }

  async update(companyId: string, id: string, dto: UpdateWarehouseDto) {
    await this.findOne(companyId, id);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async addBin(companyId: string, warehouseId: string, dto: CreateBinDto) {
    await this.findOne(companyId, warehouseId);
    return this.prisma.binLocation.create({
      data: { ...dto, warehouseId },
    });
  }

  async getBins(companyId: string, warehouseId: string) {
    await this.findOne(companyId, warehouseId);
    return this.prisma.binLocation.findMany({ where: { warehouseId } });
  }

  async transferStock(companyId: string, dto: StockTransferDto) {
    return this.inventoryService.recordStockMovement(companyId, {
      itemId: dto.itemId,
      fromWarehouseId: dto.fromWarehouseId,
      toWarehouseId: dto.toWarehouseId,
      quantity: dto.quantity,
      movementType: 'TRANSFER',
      referenceType: 'TRANSFER',
      notes: dto.notes,
    });
  }
}
