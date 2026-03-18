import { Module } from '@nestjs/common';
import { BioPagesModule } from './bio-pages/bio-pages.module';

@Module({
  imports: [BioPagesModule],
})
export class AppModule {}
