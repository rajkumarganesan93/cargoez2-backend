import { Inject, Injectable } from '@nestjs/common';
import { AlreadyExistsException } from '@cargoez/api';
import { Operation } from '../../../domain/entities/operation.entity';
import { IOperationRepository, OPERATION_REPOSITORY } from '../../../domain/repositories/operation-repository.interface';

@Injectable()
export class CreateOperationUseCase {
  constructor(@Inject(OPERATION_REPOSITORY) private readonly operationRepo: IOperationRepository) {}

  async execute(data: { code: string; name: string; description?: string }): Promise<Operation> {
    const existing = await this.operationRepo.findByCode(data.code);
    if (existing) throw new AlreadyExistsException('Operation');
    return this.operationRepo.save(data as Partial<Operation>);
  }
}
