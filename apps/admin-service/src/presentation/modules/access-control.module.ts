import { Module } from '@nestjs/common';
import { TenantDatabaseModule } from '@cargoez/shared';
import { AccessControlController } from '../controllers/access-control.controller';
import { AccessControlService } from '../../infrastructure/services/access-control.service';

@Module({
  imports: [TenantDatabaseModule.forRoot()],
  controllers: [AccessControlController],
  providers: [AccessControlService],
})
export class AccessControlModule {}
