import { Module } from '@nestjs/common';
import { BioPagesController } from './bio-pages.controller';
import { BioPagesService } from './bio-pages.service';
import { DatabaseService } from '../common/database.service';

@Module({
  controllers: [BioPagesController],
  providers: [DatabaseService, BioPagesService],
})
export class BioPagesModule {}
