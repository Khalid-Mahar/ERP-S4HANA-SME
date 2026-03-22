import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ApprovalService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalModule {}
