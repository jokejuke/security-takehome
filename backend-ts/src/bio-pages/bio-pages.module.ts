import { Module } from '@nestjs/common';
import { BioPagesController } from './bio-pages.controller';
import { BioPagesService } from './bio-pages.service';
import { AuthModule } from '../auth/auth.module';
import { SharingModule } from '../sharing/sharing.module';

@Module({
  imports: [AuthModule, SharingModule],
  controllers: [BioPagesController],
  providers: [BioPagesService],
})
export class BioPagesModule {}
