import { Inject, Injectable } from '@nestjs/common';
import { PaginationOptions, PaginatedResult } from '@cargoez/domain';
import { Operation } from '../../../domain/entities/operation.entity';
import { IOperationRepository, OPERATION_REPOSITORY } from '../../../domain/repositories/operation-repository.interface';

@Injectable()
export class GetAllOperationsUseCase {
  constructor(@Inject(OPERATION_REPOSITORY) private readonly operationRepo: IOperationRepository) {}

  execute(options: PaginationOptions): Promise<PaginatedResult<Operation>> {
    return this.operationRepo.findAll(options);
  }
}
