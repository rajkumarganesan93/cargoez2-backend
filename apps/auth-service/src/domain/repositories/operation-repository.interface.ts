import { IBaseRepository } from '@cargoez/domain';
import { Operation } from '../entities/operation.entity';

export const OPERATION_REPOSITORY = 'OPERATION_REPOSITORY';

export interface IOperationRepository extends IBaseRepository<Operation> {
  findByCode(code: string): Promise<Operation | null>;
}
