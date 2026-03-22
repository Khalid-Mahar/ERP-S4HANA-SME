import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateAccountDto, UpdateAccountDto,
  CreateTransactionDto, FinancialReportDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private prisma: PrismaService) {}

  // ── Chart of Accounts ──────────────────────────────────────────

  async createAccount(companyId: string, dto: CreateAccountDto) {
    if (dto.parentId) {
      const parent = await this.prisma.account.findFirst({ where: { id: dto.parentId, companyId } });
      if (!parent) throw new NotFoundException('Parent account not found');
    }
    return this.prisma.account.create({ data: { ...dto, companyId } });
  }

  async getChartOfAccounts(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
      include: { children: { orderBy: { code: 'asc' } } },
    });
    // Return top-level only (children are nested)
    return accounts.filter((a) => !a.parentId);
  }

  async updateAccount(companyId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findFirst({ where: { id, companyId } });
    if (!account) throw new NotFoundException('Account not found');
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  // ── Transactions ───────────────────────────────────────────────

  async createTransaction(companyId: string, dto: CreateTransactionDto) {
    // Validate double-entry: debits must equal credits
    const totalDebits = dto.lines
      .filter((l) => l.debitAccountId)
      .reduce((s, l) => s + l.amount, 0);
    const totalCredits = dto.lines
      .filter((l) => l.creditAccountId)
      .reduce((s, l) => s + l.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        `Unbalanced transaction: debits (${totalDebits}) ≠ credits (${totalCredits})`,
      );
    }

    // Validate all accounts belong to this company
    const accountIds = [
      ...dto.lines.map((l) => l.debitAccountId),
      ...dto.lines.map((l) => l.creditAccountId),
    ].filter(Boolean) as string[];

    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, companyId },
    });
    if (accounts.length !== new Set(accountIds).size) {
      throw new BadRequestException('One or more accounts not found or unauthorized');
    }

    return this.prisma.transaction.create({
      data: {
        companyId,
        transactionDate: new Date(dto.transactionDate),
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        totalAmount: totalDebits,
        lines: { create: dto.lines },
      },
      include: {
        lines: {
          include: {
            debitAccount: { select: { code: true, name: true } },
            creditAccount: { select: { code: true, name: true } },
          },
        },
      },
    });
  }

  async getTransactions(companyId: string, pagination: PaginationDto) {
    const where: any = { companyId };
    if (pagination.search) {
      where.description = { contains: pagination.search, mode: 'insensitive' };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { transactionDate: 'desc' },
        include: { _count: { select: { lines: true } } },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return new PaginatedResult(transactions, total, pagination);
  }

  async getTransactionById(companyId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, companyId },
      include: {
        lines: {
          include: {
            debitAccount: { select: { code: true, name: true, type: true } },
            creditAccount: { select: { code: true, name: true, type: true } },
          },
        },
      },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  // ── Financial Reports ──────────────────────────────────────────

  async getIncomeStatement(companyId: string, dto: FinancialReportDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    const accounts = await this.prisma.account.findMany({
      where: { companyId, type: { in: ['REVENUE', 'EXPENSE'] } },
      include: {
        debitLines: {
          include: { transaction: true },
          where: { transaction: { transactionDate: { gte: start, lte: end } } },
        },
        creditLines: {
          include: { transaction: true },
          where: { transaction: { transactionDate: { gte: start, lte: end } } },
        },
      },
      orderBy: { code: 'asc' },
    });

    const revenue = accounts
      .filter((a) => a.type === 'REVENUE')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: a.creditLines.reduce((s, l) => s + Number(l.amount), 0) -
                a.debitLines.reduce((s, l) => s + Number(l.amount), 0),
      }));

    const expenses = accounts
      .filter((a) => a.type === 'EXPENSE')
      .map((a) => ({
        code: a.code,
        name: a.name,
        amount: a.debitLines.reduce((s, l) => s + Number(l.amount), 0) -
                a.creditLines.reduce((s, l) => s + Number(l.amount), 0),
      }));

    const totalRevenue = revenue.reduce((s, a) => s + a.amount, 0);
    const totalExpenses = expenses.reduce((s, a) => s + a.amount, 0);

    return {
      period: { start: dto.startDate, end: dto.endDate },
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  async getTrialBalance(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      include: { debitLines: true, creditLines: true },
      orderBy: { code: 'asc' },
    });

    const rows = accounts.map((a) => {
      const totalDebits = a.debitLines.reduce((s, l) => s + Number(l.amount), 0);
      const totalCredits = a.creditLines.reduce((s, l) => s + Number(l.amount), 0);
      return {
        code: a.code,
        name: a.name,
        type: a.type,
        totalDebits,
        totalCredits,
        balance: totalDebits - totalCredits,
      };
    });

    const sumDebits = rows.reduce((s, r) => s + r.totalDebits, 0);
    const sumCredits = rows.reduce((s, r) => s + r.totalCredits, 0);

    return {
      accounts: rows,
      totals: { debits: sumDebits, credits: sumCredits },
      isBalanced: Math.abs(sumDebits - sumCredits) < 0.01,
    };
  }
}
