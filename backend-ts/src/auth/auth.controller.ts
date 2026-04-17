import { Body, Controller, Get, HttpCode, HttpStatus, Post, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-up')
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(@Headers('authorization') authHeader: string) {
    const token = authHeader?.substring(7) || '';
    await this.authService.signOut(token);
  }

  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.authService.getPublicKey() };
  }
}
