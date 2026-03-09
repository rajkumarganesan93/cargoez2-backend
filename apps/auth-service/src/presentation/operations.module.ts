import { Module } from '@nestjs/common';
import { OPERATION_REPOSITORY } from '../domain/repositories/operation-repository.interface';
import { OperationRepository } from '../infrastructure/repositories/operation.repository';
import { GetAllOperationsUseCase } from '../application/use-cases/operations/get-all-operations.use-case';
import { CreateOperationUseCase } from '../application/use-cases/operations/create-operation.use-case';
import { OperationsController } from './controllers/operations.controller';

@Module({
  controllers: [OperationsController],
  providers: [
    { provide: OPERATION_REPOSITORY, useClass: OperationRepository },
    GetAllOperationsUseCase,
    CreateOperationUseCase,
  ],
  exports: [OPERATION_REPOSITORY],
})
export class OperationsModule {}
