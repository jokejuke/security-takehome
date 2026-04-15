import { Module } from '@nestjs/common';
import { BioPagesModule } from './bio-pages/bio-pages.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [BioPagesModule, AuthModule],
})
export class AppModule { }
