import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateAccountDto, UpdateAccountDto, CreateTransactionDto, FinancialReportDto } from './dto/finance.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('accounts')
  @Roles(Role.ADMIN)
  createAccount(@CurrentUser() user: any, @Body() dto: CreateAccountDto) {
    return this.financeService.createAccount(user.companyId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get full chart of accounts (tree structure)' })
  getAccounts(@CurrentUser() user: any) {
    return this.financeService.getChartOfAccounts(user.companyId);
  }

  @Put('accounts/:id')
  @Roles(Role.ADMIN)
  updateAccount(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.financeService.updateAccount(user.companyId, id, dto);
  }

  @Post('transactions')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a double-entry accounting transaction' })
  createTransaction(@CurrentUser() user: any, @Body() dto: CreateTransactionDto) {
    return this.financeService.createTransaction(user.companyId, dto);
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: any, @Query() p: PaginationDto) {
    return this.financeService.getTransactions(user.companyId, p);
  }

  @Get('transactions/:id')
  getTransaction(@CurrentUser() user: any, @Param('id') id: string) {
    return this.financeService.getTransactionById(user.companyId, id);
  }

  @Get('reports/income-statement')
  @ApiOperation({ summary: 'Profit & Loss report for a date range' })
  getIncomeStatement(@CurrentUser() user: any, @Query() dto: FinancialReportDto) {
    return this.financeService.getIncomeStatement(user.companyId, dto);
  }

  @Get('reports/trial-balance')
  @ApiOperation({ summary: 'Trial balance across all accounts' })
  getTrialBalance(@CurrentUser() user: any) {
    return this.financeService.getTrialBalance(user.companyId);
  }
}
