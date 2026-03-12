import { Module } from '@nestjs/common';
import { TenantDatabaseModule } from '@cargoez/shared';
import { AuthModule } from '@cargoez/infrastructure';
import { HealthController } from './presentation/controllers/health.controller';
import { InvoiceController } from './presentation/controllers/invoice.controller';
import { InvoiceRepository, InvoiceItemRepository } from './infrastructure/repositories/invoice.repository';

@Module({
  imports: [
    TenantDatabaseModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController, InvoiceController],
  providers: [InvoiceRepository, InvoiceItemRepository],
})
export class AppModule {}
