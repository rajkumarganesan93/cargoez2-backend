import { Request, Response } from 'express';
import { NotFoundError } from '@cargoez2/infrastructure';
import { success, error, successPaginated } from '@cargoez2/api';
import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase.js';
import { GetAllUsersUseCase } from '../../application/use-cases/GetAllUsersUseCase.js';
import { GetUserByIdUseCase } from '../../application/use-cases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../application/use-cases/DeleteUserUseCase.js';

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase
  ) {}

  create = async (req: Request, res: Response): Promise<Response> => {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json(error('name and email are required', 400));
    }
    const user = await this.createUserUseCase.execute({ name, email });
    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
    return res.status(201).json(success(data));
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit), 10) || 100));
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') ?? 'asc';
    const result = await this.getAllUsersUseCase.execute({
      pagination: { page, limit, sortBy, sortOrder },
    });
    const data = result.items.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    }));
    return res.status(200).json(successPaginated(data, result.meta));
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const user = await this.getUserByIdUseCase.execute(id);
    if (!user) throw new NotFoundError('User not found');
    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
    return res.status(200).json(success(data));
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { name, email } = req.body;
    if (!name && !email) {
      return res.status(400).json(error('At least one of name or email is required', 400));
    }
    const user = await this.updateUserUseCase.execute(id, { name, email });
    if (!user) throw new NotFoundError('User not found');
    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
    return res.status(200).json(success(data));
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const deleted = await this.deleteUserUseCase.execute(id);
    if (!deleted) throw new NotFoundError('User not found');
    return res.status(200).json(success(undefined, 'User deleted successfully'));
  };
}
