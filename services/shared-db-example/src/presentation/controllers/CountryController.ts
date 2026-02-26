import type { Response } from 'express';
import type { ValidatedRequest } from '@rajkumarganesan93/infrastructure';
import { NotFoundError, sendSuccess, sendPaginated } from '@rajkumarganesan93/infrastructure';
import { MessageCode } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import type { CreateCountryBody, UpdateCountryBody, IdParams } from '../../models/country.models.js';
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

  create = async (req: ValidatedRequest<CreateCountryBody>, res: Response): Promise<Response> => {
    const country = await this.createCountryUseCase.execute(req.validated.body);
    return sendSuccess(res, country, MessageCode.CREATED, { resource: 'Country' });
  };

  getAll = async (req: ValidatedRequest, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllCountriesUseCase.execute({ pagination });
    return sendPaginated(res, result.items, result.meta, MessageCode.LIST_FETCHED, { resource: 'Country' });
  };

  getById = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
    const country = await this.getCountryByIdUseCase.execute(req.validated.params.id);
    if (!country) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Country' });
    return sendSuccess(res, country, MessageCode.FETCHED, { resource: 'Country' });
  };

  update = async (req: ValidatedRequest<UpdateCountryBody, IdParams>, res: Response): Promise<Response> => {
    const country = await this.updateCountryUseCase.execute(req.validated.params.id, req.validated.body);
    if (!country) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Country' });
    return sendSuccess(res, country, MessageCode.UPDATED, { resource: 'Country' });
  };

  delete = async (req: ValidatedRequest<unknown, IdParams>, res: Response): Promise<Response> => {
    const deleted = await this.deleteCountryUseCase.execute(req.validated.params.id);
    if (!deleted) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Country' });
    return sendSuccess(res, undefined, MessageCode.DELETED, { resource: 'Country' });
  };
}
