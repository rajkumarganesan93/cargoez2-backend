import { Request, Response } from 'express';
import { success, error } from '@cargoez2/api';
import { RegisterUseCase } from '../../application/use-cases/RegisterUseCase.js';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase.js';
import { ValidateTokenUseCase } from '../../application/use-cases/ValidateTokenUseCase.js';

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly validateTokenUseCase: ValidateTokenUseCase
  ) {}

  register = async (req: Request, res: Response): Promise<Response> => {
    const { email, password, roleName } = req.body;
    if (!email || !password) {
      return res.status(400).json(error('email and password are required', 400));
    }
    const user = await this.registerUseCase.execute({
      email,
      password,
      roleName,
    });
    const data = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      createdAt: user.createdAt.toISOString(),
    };
    return res.status(201).json(success(data));
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(error('email and password are required', 400));
    }
    const result = await this.loginUseCase.execute({ email, password });
    const data = {
      token: result.token,
      expiresAt: result.expiresAt,
      userId: result.userId,
      email: result.email,
    };
    return res.status(200).json(success(data));
  };

  validateToken = async (req: Request, res: Response): Promise<Response> => {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(400).json(error('Token required', 400));
    }
    const result = await this.validateTokenUseCase.execute(token);
    if (!result.valid) {
      return res.status(401).json(error('Token invalid or expired', 401));
    }
    const data = { valid: true, userId: result.userId };
    return res.status(200).json(success(data));
  };
}
