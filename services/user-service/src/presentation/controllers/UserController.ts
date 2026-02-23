import { Request, Response } from 'express';
import { BadRequestError, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { success, error, successPaginated, MessageCode } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase.js';
import { GetAllUsersUseCase } from '../../application/use-cases/GetAllUsersUseCase.js';
import { GetUserByIdUseCase } from '../../application/use-cases/GetUserByIdUseCase.js';
import { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from '../../application/use-cases/DeleteUserUseCase.js';

const ALLOWED_SORT_FIELDS = ['name', 'email', 'createdAt', 'modifiedAt'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 150;

function assertValidUuid(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new BadRequestError(MessageCode.INVALID_INPUT, { reason: 'id must be a valid UUID' });
  }
}

function toUserResponse(user: { id: string; name: string; email: string; isActive: boolean; createdAt: string; modifiedAt: string }) {
  return { id: user.id, name: user.name, email: user.email, isActive: user.isActive, createdAt: user.createdAt, modifiedAt: user.modifiedAt };
}

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<Response> => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!name || !email) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'name and email' }));
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: `name exceeds ${MAX_NAME_LENGTH} characters` }));
    }
    if (!EMAIL_REGEX.test(email) || email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: 'invalid email format' }));
    }

    const user = await this.createUserUseCase.execute({ name, email });
    return res.status(201).json(success(toUserResponse(user), MessageCode.CREATED, { resource: 'User' }));
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllUsersUseCase.execute({ pagination });
    const data = result.items.map(toUserResponse);
    return res.status(200).json(successPaginated(data, result.meta, MessageCode.LIST_FETCHED, { resource: 'User' }));
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    assertValidUuid(req.params.id);
    const user = await this.getUserByIdUseCase.execute(req.params.id);
    if (!user) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return res.status(200).json(success(toUserResponse(user), MessageCode.FETCHED, { resource: 'User' }));
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    assertValidUuid(req.params.id);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : undefined;

    if (!name && !email) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'name or email' }));
    }
    if (name !== undefined && name.length > MAX_NAME_LENGTH) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: `name exceeds ${MAX_NAME_LENGTH} characters` }));
    }
    if (email !== undefined && (!EMAIL_REGEX.test(email) || email.length > MAX_EMAIL_LENGTH)) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: 'invalid email format' }));
    }

    const user = await this.updateUserUseCase.execute(req.params.id, { name, email });
    if (!user) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return res.status(200).json(success(toUserResponse(user), MessageCode.UPDATED, { resource: 'User' }));
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    assertValidUuid(req.params.id);
    const deleted = await this.deleteUserUseCase.execute(req.params.id);
    if (!deleted) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'User' });
    return res.status(200).json(success(undefined, MessageCode.DELETED, { resource: 'User' }));
  };
}
