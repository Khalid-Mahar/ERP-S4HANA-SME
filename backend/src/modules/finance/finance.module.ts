import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { InvoiceService } from './invoice.service';
import { FinanceController } from './finance.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [FinanceService, InvoiceService],
  controllers: [FinanceController],
  exports: [FinanceService, InvoiceService],
})
export class FinanceModule {}
