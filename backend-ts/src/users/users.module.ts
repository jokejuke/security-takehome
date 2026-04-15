import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuthModule, AuditLogsModule],
  controllers: [UsersController],
})
export class UsersModule {}
