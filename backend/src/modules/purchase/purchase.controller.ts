import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import {
  CreateVendorDto, UpdateVendorDto,
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto, GoodsReceiptDto, UpdatePurchaseOrderStatusDto,
} from './dto/purchase.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Purchase')
@ApiBearerAuth('access-token')
@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get('kpi/pending-pos')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CFO, Role.WAREHOUSE_HEAD)
  @ApiOperation({ summary: 'Pending purchase orders count' })
  getPendingPos(@CurrentUser() user: any) {
    return this.purchaseService.getPendingPosKpi(user.companyId);
  }

  @Post('vendors')
  @Roles(Role.MANAGER, Role.ADMIN)
  createVendor(@CurrentUser() user: any, @Body() dto: CreateVendorDto) {
    return this.purchaseService.createVendor(user.companyId, dto);
  }

  @Get('vendors')
  findVendors(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.purchaseService.findAllVendors(user.companyId, p);
  }

  @Get('vendors/:id')
  findVendor(@CurrentUser() user: any, @Param('id') id: string) {
    return this.purchaseService.findVendorById(user.companyId, id);
  }

  @Put('vendors/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  updateVendor(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.purchaseService.updateVendor(user.companyId, id, dto);
  }

  @Post('orders')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Create a purchase order' })
  createOrder(@CurrentUser() user: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseService.createPurchaseOrder(user.companyId, dto);
  }

  @Get('orders')
  findOrders(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.purchaseService.findAllPurchaseOrders(user.companyId, p);
  }

  @Get('orders/:id')
  findOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.purchaseService.findPurchaseOrderById(user.companyId, id);
  }

  @Put('orders/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Edit a purchase order (allowed before RECEIVED)' })
  updateOrder(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseService.updatePurchaseOrder(user.companyId, user.id, id, dto);
  }

  @Patch('orders/:id/status')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Update purchase order status' })
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderStatusDto) {
    return this.purchaseService.updateOrderStatus(user.companyId, user.id, id, dto);
  }

  @Post('orders/:id/receive')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Receive goods against a purchase order (increases stock)' })
  receiveGoods(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: GoodsReceiptDto) {
    return this.purchaseService.receiveGoods(user.companyId, user.id, id, dto);
  }
}
