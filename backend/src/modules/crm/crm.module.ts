import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CrmService],
  controllers: [CrmController],
  exports: [CrmService],
})
export class CRMModule {}
