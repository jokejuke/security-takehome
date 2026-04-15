import { Module } from '@nestjs/common';
import { BioPagesController } from './bio-pages.controller';
import { BioPagesService } from './bio-pages.service';
import { AuthModule } from '../auth/auth.module';
import { SharingModule } from '../sharing/sharing.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuthModule, SharingModule, AuditLogsModule],
  controllers: [BioPagesController],
  providers: [BioPagesService],
})
export class BioPagesModule {}
