import { Module } from '@nestjs/common';
import { TenantDatabaseModule } from '@cargoez/shared';
import { AuthModule } from '@cargoez/infrastructure';
import { HealthController } from './presentation/controllers/health.controller';
import { ContactController } from './presentation/controllers/contact.controller';
import { ContactRepository } from './infrastructure/repositories/contact.repository';

@Module({
  imports: [
    TenantDatabaseModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController, ContactController],
  providers: [ContactRepository],
})
export class AppModule {}
