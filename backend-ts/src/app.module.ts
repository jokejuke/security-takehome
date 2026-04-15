import { Module, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from './common/database.module';
import { BioPagesModule } from './bio-pages/bio-pages.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SharingModule } from './sharing/sharing.module';
import { DatabaseService } from './common/database.service';

@Module({
  imports: [DatabaseModule, AuthModule, BioPagesModule, UsersModule, SharingModule],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    await this.database.seedTestData();
  }
}
