import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateCustomerDto, UpdateCustomerDto, CreateSalesOrderDto, UpdateSalesOrderStatusDto } from './dto/sales.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Sales')
@ApiBearerAuth('access-token')
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // Customers
  @Post('customers') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  createCustomer(@CompanyId() cid: string, @Body() dto: CreateCustomerDto) { return this.salesService.createCustomer(cid, dto); }

  @Get('customers')
  findCustomers(@CompanyId() cid: string, @Query() p: PaginationDto) { return this.salesService.findAllCustomers(cid, p); }

  @Get('customers/:id')
  findCustomer(@CompanyId() cid: string, @Param('id') id: string) { return this.salesService.findCustomerById(cid, id); }

  @Put('customers/:id') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateCustomer(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.salesService.updateCustomer(cid, id, dto); }

  // Sales Orders
  @Post('orders') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new sales order' })
  createOrder(@CompanyId() cid: string, @Body() dto: CreateSalesOrderDto) { return this.salesService.createSalesOrder(cid, dto); }

  @Get('orders')
  findOrders(@CompanyId() cid: string, @Query() p: PaginationDto) { return this.salesService.findAllSalesOrders(cid, p); }

  @Get('orders/summary') @ApiOperation({ summary: 'Get sales KPI summary' })
  getSummary(@CompanyId() cid: string) { return this.salesService.getSalesSummary(cid); }

  @Get('orders/:id')
  findOrder(@CompanyId() cid: string, @Param('id') id: string) { return this.salesService.findSalesOrderById(cid, id); }

  @Patch('orders/:id/status') @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update sales order status (triggers inventory deduction on SHIPPED)' })
  @ApiQuery({ name: 'warehouseId', required: false })
  updateStatus(
    @CompanyId() cid: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderStatusDto,
    @Query('warehouseId') warehouseId?: string,
  ) { return this.salesService.updateOrderStatus(cid, id, dto, warehouseId); }
}
