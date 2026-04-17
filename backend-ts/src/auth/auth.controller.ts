import { Body, Controller, Get, HttpCode, HttpStatus, Post, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface SignOutBody {
  refreshToken?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-up')
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  /**
   * Returns an access + refresh token pair (RFC 6749 §4.3).
   */
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  /**
   * RFC 6749 §6 — Exchange a valid refresh token for a new token pair.
   * The supplied refresh token is revoked immediately (rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * Revoke the current session.
   * Access token is read from the Authorization header; refresh token from the
   * request body (optional but recommended so both are invalidated at once).
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @Headers('authorization') authHeader: string,
    @Body() body: SignOutBody,
  ) {
    const accessToken = authHeader?.substring(7) || '';
    await this.authService.signOut(accessToken, body?.refreshToken);
  }

  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.authService.getPublicKey() };
  }
}
