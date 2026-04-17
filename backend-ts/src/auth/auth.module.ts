import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginThrottleService } from './login-throttle.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, TokenBlacklistService, LoginThrottleService],
  exports: [AuthService, AuthGuard, TokenBlacklistService],
})
export class AuthModule {}
