import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule } from '@cargoez/infrastructure';

import { HealthController } from './presentation/controllers/health.controller';
import { DashboardController } from './presentation/controllers/dashboard.controller';
import { MetadataModule } from './presentation/modules/metadata.module';
import { TenantsModule } from './presentation/modules/tenants.module';
import { AppCustomersModule } from './presentation/modules/app-customers.module';
import { BranchCustomersModule } from './presentation/modules/branch-customers.module';
import { SysAdminsModule } from './presentation/modules/sys-admins.module';
import { MasterCatalogModule } from './presentation/modules/master-catalog.module';
import { ProductsModule } from './presentation/modules/products.module';
import { SubscriptionsModule } from './presentation/modules/subscriptions.module';
import { AccessControlModule } from './presentation/modules/access-control.module';
import { AdminAccessControlModule } from './presentation/modules/admin-access-control.module';
import { InternalModule } from './presentation/modules/internal.module';

@Module({
  imports: [
    DatabaseModule.forRoot({
      connectionPrefix: 'ADMIN',
      database: process.env.ADMIN_DB_NAME || 'admin_db',
    }),
    AuthModule,
    MetadataModule,
    TenantsModule,
    AppCustomersModule,
    BranchCustomersModule,
    SysAdminsModule,
    MasterCatalogModule,
    ProductsModule,
    SubscriptionsModule,
    AccessControlModule,
    AdminAccessControlModule,
    InternalModule,
  ],
  controllers: [HealthController, DashboardController],
})
export class AdminServiceModule {}
