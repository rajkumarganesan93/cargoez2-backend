import { Request, Response } from 'express';
import { NotFoundError } from '@rajkumarganesan93/infrastructure';
import { success, error, successPaginated } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import { CreateCountryUseCase } from '../../application/use-cases/CreateCountryUseCase.js';
import { GetAllCountriesUseCase } from '../../application/use-cases/GetAllCountriesUseCase.js';
import { GetCountryByIdUseCase } from '../../application/use-cases/GetCountryByIdUseCase.js';
import { UpdateCountryUseCase } from '../../application/use-cases/UpdateCountryUseCase.js';
import { DeleteCountryUseCase } from '../../application/use-cases/DeleteCountryUseCase.js';

const ALLOWED_SORT_FIELDS = ['code', 'name', 'createdAt', 'modifiedAt'];

export class CountryController {
  constructor(
    private readonly createCountryUseCase: CreateCountryUseCase,
    private readonly getAllCountriesUseCase: GetAllCountriesUseCase,
    private readonly getCountryByIdUseCase: GetCountryByIdUseCase,
    private readonly updateCountryUseCase: UpdateCountryUseCase,
    private readonly deleteCountryUseCase: DeleteCountryUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<Response> => {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json(error('code and name are required', 400));
    }
    const country = await this.createCountryUseCase.execute({ code, name });
    return res.status(201).json(success({
      id: country.id,
      code: country.code,
      name: country.name,
      createdAt: country.createdAt instanceof Date ? country.createdAt.toISOString() : country.createdAt,
    }));
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllCountriesUseCase.execute({ pagination });
    const data = result.items.map((country) => ({
      id: country.id,
      code: country.code,
      name: country.name,
      createdAt: country.createdAt instanceof Date ? country.createdAt.toISOString() : country.createdAt,
    }));
    return res.status(200).json(successPaginated(data, result.meta));
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const country = await this.getCountryByIdUseCase.execute(id);
    if (!country) throw new NotFoundError('Country not found');
    return res.status(200).json(success({
      id: country.id,
      code: country.code,
      name: country.name,
      createdAt: country.createdAt instanceof Date ? country.createdAt.toISOString() : country.createdAt,
    }));
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { code, name } = req.body;
    if (!code && !name) {
      return res.status(400).json(error('At least one of code or name is required', 400));
    }
    const country = await this.updateCountryUseCase.execute(id, { code, name });
    if (!country) throw new NotFoundError('Country not found');
    return res.status(200).json(success({
      id: country.id,
      code: country.code,
      name: country.name,
      createdAt: country.createdAt instanceof Date ? country.createdAt.toISOString() : country.createdAt,
    }));
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const deleted = await this.deleteCountryUseCase.execute(id);
    if (!deleted) throw new NotFoundError('Country not found');
    return res.status(200).json(success(undefined, 'Country deleted successfully'));
  };
}
