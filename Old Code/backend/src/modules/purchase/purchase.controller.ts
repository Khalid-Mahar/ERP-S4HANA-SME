import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import {
  CreateVendorDto, UpdateVendorDto,
  CreatePurchaseOrderDto, GoodsReceiptDto,
} from './dto/purchase.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Purchase')
@ApiBearerAuth('access-token')
@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // Vendors
  @Post('vendors') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  createVendor(@CompanyId() cid: string, @Body() dto: CreateVendorDto) {
    return this.purchaseService.createVendor(cid, dto);
  }

  @Get('vendors')
  findVendors(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.purchaseService.findAllVendors(cid, p);
  }

  @Get('vendors/:id')
  findVendor(@CompanyId() cid: string, @Param('id') id: string) {
    return this.purchaseService.findVendorById(cid, id);
  }

  @Put('vendors/:id') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateVendor(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.purchaseService.updateVendor(cid, id, dto);
  }

  // Purchase Orders
  @Post('orders') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a purchase order' })
  createOrder(@CompanyId() cid: string, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseService.createPurchaseOrder(cid, dto);
  }

  @Get('orders')
  findOrders(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.purchaseService.findAllPurchaseOrders(cid, p);
  }

  @Get('orders/:id')
  findOrder(@CompanyId() cid: string, @Param('id') id: string) {
    return this.purchaseService.findPurchaseOrderById(cid, id);
  }

  // GRN - Goods Receipt
  @Post('orders/:id/receive') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Receive goods against a purchase order (increases stock)' })
  receiveGoods(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: GoodsReceiptDto) {
    return this.purchaseService.receiveGoods(cid, id, dto);
  }
}
