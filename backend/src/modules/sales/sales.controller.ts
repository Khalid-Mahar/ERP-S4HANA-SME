import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateCustomerDto, UpdateCustomerDto, CreateSalesOrderDto, ShipSalesOrderDto, UpdateSalesOrderDto, UpdateSalesOrderStatusDto } from './dto/sales.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Sales')
@ApiBearerAuth('access-token')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('customers')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SALES_MANAGER)
  createCustomer(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.salesService.createCustomer(user.companyId, dto);
  }

  @Get('customers')
  findCustomers(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.salesService.findAllCustomers(user.companyId, p);
  }

  @Get('customers/:id')
  findCustomer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.findCustomerById(user.companyId, id);
  }

  @Put('customers/:id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SALES_MANAGER)
  updateCustomer(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.salesService.updateCustomer(user.companyId, id, dto);
  }

  @Post('orders')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Create a new sales order' })
  createOrder(@CurrentUser() user: any, @Body() dto: CreateSalesOrderDto) {
    return this.salesService.createSalesOrder(user.companyId, user.id, dto);
  }

  @Get('orders')
  findOrders(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.salesService.findAllSalesOrders(user.companyId, p);
  }

  @Get('orders/summary')
  @ApiOperation({ summary: 'Get sales KPI summary' })
  getSummary(@CurrentUser() user: any) {
    return this.salesService.getSalesSummary(user.companyId);
  }

  @Get('orders/:id')
  findOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.findSalesOrderById(user.companyId, id);
  }

  @Put('orders/:id')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Edit a sales order (allowed before SHIPPED)' })
  updateOrder(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesService.updateSalesOrder(user.companyId, user.id, id, dto);
  }

  @Patch('orders/:id/status')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Update sales order status (triggers inventory deduction on SHIPPED)' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
  ) {
    return this.salesService.updateOrderStatus(user.companyId, user.id, id, dto);
  }

  @Post('orders/:id/ship')
  @Roles(Role.MANAGER, Role.ADMIN, Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Create a sales shipment (supports partial shipments)' })
  shipOrder(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ShipSalesOrderDto) {
    return this.salesService.shipSalesOrder(user.companyId, user.id, id, dto);
  }

  @Get('kpi/sales-returns')
  getSalesReturns(@CurrentUser() user: any) {
    return this.salesService.getSalesReturnsKPI(user.companyId);
  }

  @Get('analytics/top-products')
  getTopProducts(@CurrentUser() user: any) {
    return this.salesService.getTopProducts(user.companyId);
  }

  @Get('analytics/monthly-revenue')
  @ApiOperation({ summary: 'Monthly revenue series for dashboards' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getMonthlyRevenue(@CurrentUser() user: any, @Query('months') months?: string) {
    const m = months ? Number(months) : 6;
    return this.salesService.getMonthlyRevenue(user.companyId, Number.isFinite(m) ? m : 6);
  }
}
