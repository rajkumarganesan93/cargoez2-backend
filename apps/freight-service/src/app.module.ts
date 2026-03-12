import { Module } from '@nestjs/common';
import { TenantDatabaseModule } from '@cargoez/shared';
import { AuthModule } from '@cargoez/infrastructure';
import { HealthController } from './presentation/controllers/health.controller';
import { ShipmentController } from './presentation/controllers/shipment.controller';
import { ShipmentRepository } from './infrastructure/repositories/shipment.repository';

@Module({
  imports: [
    TenantDatabaseModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController, ShipmentController],
  providers: [ShipmentRepository],
})
export class AppModule {}
