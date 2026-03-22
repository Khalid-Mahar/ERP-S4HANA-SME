import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateAccountDto, UpdateAccountDto, CreateTransactionDto, FinancialReportDto } from './dto/finance.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CompanyId } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Chart of Accounts
  @Post('accounts') @Roles(UserRole.ADMIN)
  createAccount(@CompanyId() cid: string, @Body() dto: CreateAccountDto) {
    return this.financeService.createAccount(cid, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get full chart of accounts (tree structure)' })
  getAccounts(@CompanyId() cid: string) {
    return this.financeService.getChartOfAccounts(cid);
  }

  @Put('accounts/:id') @Roles(UserRole.ADMIN)
  updateAccount(@CompanyId() cid: string, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.financeService.updateAccount(cid, id, dto);
  }

  // Transactions
  @Post('transactions') @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a double-entry accounting transaction' })
  createTransaction(@CompanyId() cid: string, @Body() dto: CreateTransactionDto) {
    return this.financeService.createTransaction(cid, dto);
  }

  @Get('transactions')
  getTransactions(@CompanyId() cid: string, @Query() p: PaginationDto) {
    return this.financeService.getTransactions(cid, p);
  }

  @Get('transactions/:id')
  getTransaction(@CompanyId() cid: string, @Param('id') id: string) {
    return this.financeService.getTransactionById(cid, id);
  }

  // Reports
  @Get('reports/income-statement')
  @ApiOperation({ summary: 'Profit & Loss report for a date range' })
  getIncomeStatement(@CompanyId() cid: string, @Query() dto: FinancialReportDto) {
    return this.financeService.getIncomeStatement(cid, dto);
  }

  @Get('reports/trial-balance')
  @ApiOperation({ summary: 'Trial balance across all accounts' })
  getTrialBalance(@CompanyId() cid: string) {
    return this.financeService.getTrialBalance(cid);
  }
}
