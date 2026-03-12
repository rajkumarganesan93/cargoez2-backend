import { Module } from '@nestjs/common';
import { MasterCatalogController } from '../controllers/master-catalog.controller';
import { ModuleCatalogRepository, OperationCatalogRepository } from '../../infrastructure/repositories/master-catalog.repository';

@Module({
  controllers: [MasterCatalogController],
  providers: [ModuleCatalogRepository, OperationCatalogRepository],
})
export class MasterCatalogModule {}
