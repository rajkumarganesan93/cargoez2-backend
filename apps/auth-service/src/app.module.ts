import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cargoez/shared';
import { AuthModule } from '@cargoez/infrastructure';
import { RolesModule } from './presentation/roles.module';
import { ModulesModule } from './presentation/modules.module';
import { ScreensModule } from './presentation/screens.module';
import { OperationsModule } from './presentation/operations.module';
import { PermissionsModule } from './presentation/permissions.module';
import { RolePermissionsModule } from './presentation/role-permissions.module';
import { HealthController } from './presentation/controllers/health.controller';

@Module({
  imports: [
    DatabaseModule.forRoot({ connectionPrefix: 'AUTH_SERVICE' }),
    AuthModule,
    RolesModule,
    ModulesModule,
    ScreensModule,
    OperationsModule,
    PermissionsModule,
    RolePermissionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
