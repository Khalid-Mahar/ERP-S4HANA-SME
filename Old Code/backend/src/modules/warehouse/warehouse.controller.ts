import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateBinDto, StockTransferDto } from './dto/warehouse.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Warehouse')
@ApiBearerAuth('access-token')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new warehouse' })
  create(@CompanyId() companyId: string, @Body() dto: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  findAll(@CompanyId() companyId: string, @Query() pagination: PaginationDto) {
    return this.warehouseService.findAll(companyId, pagination);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.warehouseService.findOne(companyId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehouseService.update(companyId, id, dto);
  }

  @Post(':id/bins')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add a bin location to a warehouse' })
  addBin(@CompanyId() companyId: string, @Param('id') id: string, @Body() dto: CreateBinDto) {
    return this.warehouseService.addBin(companyId, id, dto);
  }

  @Get(':id/bins')
  getBins(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.warehouseService.getBins(companyId, id);
  }

  @Post('transfer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  transfer(@CompanyId() companyId: string, @Body() dto: StockTransferDto) {
    return this.warehouseService.transferStock(companyId, dto);
  }
}
