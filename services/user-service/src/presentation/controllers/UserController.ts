import { Request, Response } from 'express';
import { NotFoundError } from '@rajkumarganesan93/infrastructure';
import { success, error, successPaginated, MessageCode } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
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

  create = async (req: Request, res: Response): Promise<Response> => {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'name and email' }));
    }
    const user = await this.createUserUseCase.execute({ name, email });
    return res.status(201).json(success(
      { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      MessageCode.CREATED,
      { resource: 'User' },
    ));
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllUsersUseCase.execute({ pagination });
    const data = result.items.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }));
    return res.status(200).json(successPaginated(
      data,
      result.meta,
      MessageCode.LIST_FETCHED,
      { resource: 'User' },
    ));
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const user = await this.getUserByIdUseCase.execute(id);
    if (!user) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return res.status(200).json(success(
      { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      MessageCode.FETCHED,
      { resource: 'User' },
    ));
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { name, email } = req.body;
    if (!name && !email) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'name or email' }));
    }
    const user = await this.updateUserUseCase.execute(id, { name, email });
    if (!user) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return res.status(200).json(success(
      { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      MessageCode.UPDATED,
      { resource: 'User' },
    ));
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const deleted = await this.deleteUserUseCase.execute(id);
    if (!deleted) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return res.status(200).json(success(undefined, MessageCode.DELETED, { resource: 'User' }));
  };
}
