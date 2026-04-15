import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, TokenBlacklistService],
  exports: [AuthService, AuthGuard, TokenBlacklistService],
})
export class AuthModule {}
