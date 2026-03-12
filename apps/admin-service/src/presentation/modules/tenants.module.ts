import { Module } from '@nestjs/common';
import { TenantRepository } from '../../infrastructure/repositories/tenant.repository';
import { BranchRepository } from '../../infrastructure/repositories/branch.repository';
import { TenantsController } from '../controllers/tenants.controller';
import { BranchesController } from '../controllers/branches.controller';

@Module({
  controllers: [TenantsController, BranchesController],
  providers: [TenantRepository, BranchRepository],
  exports: [TenantRepository, BranchRepository],
})
export class TenantsModule {}
