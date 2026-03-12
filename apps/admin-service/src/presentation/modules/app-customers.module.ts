import { Module } from '@nestjs/common';
import { AppCustomersController } from '../controllers/app-customers.controller';
import { AppCustomerRepository } from '../../infrastructure/repositories/app-customer.repository';
import { AppCustomerCredentialRepository } from '../../infrastructure/repositories/app-customer-credential.repository';

@Module({
  controllers: [AppCustomersController],
  providers: [AppCustomerRepository, AppCustomerCredentialRepository],
  exports: [AppCustomerRepository, AppCustomerCredentialRepository],
})
export class AppCustomersModule {}
