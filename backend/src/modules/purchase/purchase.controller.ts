import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import {
  CreateVendorDto, UpdateVendorDto,
  CreatePurchaseOrderDto, GoodsReceiptDto,
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

  @Post('orders/:id/receive')
  @Roles(Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Receive goods against a purchase order (increases stock)' })
  receiveGoods(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: GoodsReceiptDto) {
    return this.purchaseService.receiveGoods(user.companyId, id, dto);
  }
}
