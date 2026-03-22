import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CostingService } from './costing.service';
import {
  CreateItemDto,
  UpdateItemDto,
  StockMovementDto,
  AdjustStockDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly costingService: CostingService,
  ) {}

  @Get('valuation')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get total inventory valuation (FIFO)' })
  getValuation(@CurrentUser() user: any) {
    return this.costingService.getInventoryValuation(user.companyId);
  }

  @Post('items')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create new inventory item' })
  createItem(@CurrentUser() user: any, @Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(user.companyId, dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Get all items (paginated)' })
  findAllItems(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    return this.inventoryService.findAllItems(user.companyId, pagination);
  }

  @Get('items/low-stock')
  @ApiOperation({ summary: 'Get items with stock below minimum level' })
  getLowStock(@CurrentUser() user: any) {
    return this.inventoryService.getLowStockItems(user.companyId);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item by ID' })
  findItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.findItemById(user.companyId, id);
  }

  @Put('items/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update item' })
  updateItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.inventoryService.updateItem(user.companyId, id, dto);
  }

  @Delete('items/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete item' })
  deleteItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.deleteItem(user.companyId, id);
  }

  @Post('movements')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Record stock movement (IN/OUT/TRANSFER)' })
  recordMovement(@CurrentUser() user: any, @Body() dto: StockMovementDto) {
    return this.inventoryService.recordStockMovement(user.companyId, dto);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get all stock movements' })
  getMovements(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getStockMovements(user.companyId, pagination, itemId);
  }

  @Post('items/:id/adjust')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually adjust stock level' })
  adjustStock(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(user.companyId, id, dto);
  }

  @Get('stock-levels')
  @ApiOperation({ summary: 'Get current stock levels' })
  getStockLevels(
    @CurrentUser() user: any,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getStockLevels(user.companyId, itemId, warehouseId);
  }
}
