import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateBinDto,
  StockTransferDto,
} from './dto/warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Warehouse')
@ApiBearerAuth('access-token')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new warehouse' })
  create(@CurrentUser() user: any, @Body() dto: CreateWarehouseDto) {
    return this.warehouseService.createWarehouse(user.companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses' })
  findAll(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    return this.warehouseService.findAll(user.companyId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse details' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.findOne(user.companyId, id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update warehouse' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(user.companyId, id, dto);
  }

  @Post(':id/bins')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Add bin location to warehouse' })
  addBin(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateBinDto,
  ) {
    return this.warehouseService.addBin(user.companyId, id, dto);
  }

  @Post('transfer')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  transfer(@CurrentUser() user: any, @Body() dto: StockTransferDto) {
    return this.warehouseService.transferStock(user.companyId, dto);
  }
}
