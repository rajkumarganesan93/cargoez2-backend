import type { Response } from 'express';
import type { ValidatedRequest, IdParams } from '@rajkumarganesan93/infrastructure';
import { NotFoundError, sendSuccess, sendPaginated } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import type { CreateUserBody, UpdateUserBody } from '../models/user.models.js';
import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase.js';
import { GetAllUsersUseCase } from '../../application/use-cases/GetAllUsersUseCase.js';
import { GetUserByIdUseCase } from '../../application/use-cases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../application/use-cases/DeleteUserUseCase.js';

const ALLOWED_SORT_FIELDS = ['name', 'email', 'createdAt', 'modifiedAt'];

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  create = async (req: ValidatedRequest<CreateUserBody>, res: Response): Promise<Response> => {
    const user = await this.createUserUseCase.execute(req.validated.body);
    return sendSuccess(res, user, MessageCode.CREATED, { resource: 'User' });
  };

  getAll = async (req: ValidatedRequest, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllUsersUseCase.execute({ pagination });
    return sendPaginated(res, result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'User' });
  };

  getById = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
    const user = await this.getUserByIdUseCase.execute(req.validated.params.id);
    if (!user) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return sendSuccess(res, user, MessageCode.FETCHED, { resource: 'User' });
  };

  update = async (req: ValidatedRequest<UpdateUserBody, IdParams>, res: Response): Promise<Response> => {
    const user = await this.updateUserUseCase.execute(req.validated.params.id, req.validated.body);
    if (!user) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return sendSuccess(res, user, MessageCode.UPDATED, { resource: 'User' });
  };

  delete = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
    const deleted = await this.deleteUserUseCase.execute(req.validated.params.id);
    if (!deleted) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return sendSuccess(res, undefined, MessageCode.DELETED, { resource: 'User' });
  };
}
