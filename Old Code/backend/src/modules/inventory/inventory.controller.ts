import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateItemDto,
  UpdateItemDto,
  StockMovementDto,
  AdjustStockDto,
} from './dto/inventory.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Items ──────────────────────────────────────────────────────

  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new inventory item' })
  create(@CompanyId() companyId: string, @Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(companyId, dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'List all items with pagination and search' })
  findAll(@CompanyId() companyId: string, @Query() pagination: PaginationDto) {
    return this.inventoryService.findAllItems(companyId, pagination);
  }

  @Get('items/low-stock')
  @ApiOperation({ summary: 'Get items below minimum stock level' })
  getLowStock(@CompanyId() companyId: string) {
    return this.inventoryService.getLowStockItems(companyId);
  }

  @Get('items/:id')
  @ApiParam({ name: 'id', description: 'Item UUID' })
  @ApiOperation({ summary: 'Get item by ID with stock levels' })
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.inventoryService.findItemById(companyId, id);
  }

  @Put('items/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update an item' })
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.inventoryService.updateItem(companyId, id, dto);
  }

  @Delete('items/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an item (fails if movements exist)' })
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.inventoryService.deleteItem(companyId, id);
  }

  // ── Stock Levels ───────────────────────────────────────────────

  @Get('stock')
  @ApiOperation({ summary: 'Get current stock levels' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  getStockLevels(
    @CompanyId() companyId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getStockLevels(companyId, itemId, warehouseId);
  }

  @Patch('items/:id/adjust-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Adjust stock count for an item in a warehouse' })
  adjustStock(
    @CompanyId() companyId: string,
    @Param('id') itemId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(companyId, itemId, dto);
  }

  // ── Stock Movements ────────────────────────────────────────────

  @Post('movements')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Record a stock movement (IN / OUT / TRANSFER)' })
  recordMovement(@CompanyId() companyId: string, @Body() dto: StockMovementDto) {
    return this.inventoryService.recordStockMovement(companyId, dto);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get stock movement history' })
  @ApiQuery({ name: 'itemId', required: false })
  getMovements(
    @CompanyId() companyId: string,
    @Query() pagination: PaginationDto,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getStockMovements(companyId, pagination, itemId);
  }
}
