import { Module } from '@nestjs/common';
import { BranchCustomersController } from '../controllers/branch-customers.controller';
import { BranchCustomerRepository } from '../../infrastructure/repositories/branch-customer.repository';
import { RelBranchCustomerRepository } from '../../infrastructure/repositories/rel-branch-customer.repository';

@Module({
  controllers: [BranchCustomersController],
  providers: [BranchCustomerRepository, RelBranchCustomerRepository],
  exports: [BranchCustomerRepository, RelBranchCustomerRepository],
})
export class BranchCustomersModule {}
