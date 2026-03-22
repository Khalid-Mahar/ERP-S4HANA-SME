import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HRModule } from './modules/hr/hr.module';
import { CRMModule } from './modules/crm/crm.module';
import { CompanyModule } from './modules/company/company.module';
import { UsersModule } from './modules/users/users.module';
import { AiModule } from './modules/ai/ai.module';
import { AuditModule } from './modules/audit/audit.module';
import { ApprovalModule } from './modules/approval/approval.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    CommonModule,
    AuditModule,
    ApprovalModule,
    AuthModule,
    InventoryModule,
    WarehouseModule,
    SalesModule,
    PurchaseModule,
    FinanceModule,
    HRModule,
    CRMModule,
    CompanyModule,
    UsersModule,
    AiModule,
  ],
})
export class AppModule {}
