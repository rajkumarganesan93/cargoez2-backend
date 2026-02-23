import { Request, Response } from 'express';
import { BadRequestError, NotFoundError } from '@rajkumarganesan93/infrastructure';
import { success, error, successPaginated, MessageCode } from '@rajkumarganesan93/api';
import { parsePaginationFromQuery } from '@rajkumarganesan93/shared';
import { CreateCountryUseCase } from '../../application/use-cases/CreateCountryUseCase.js';
import { GetAllCountriesUseCase } from '../../application/use-cases/GetAllCountriesUseCase.js';
import { GetCountryByIdUseCase } from '../../application/use-cases/GetCountryByIdUseCase.js';
import { UpdateCountryUseCase } from '../../application/use-cases/UpdateCountryUseCase.js';
import { DeleteCountryUseCase } from '../../application/use-cases/DeleteCountryUseCase.js';

const ALLOWED_SORT_FIELDS = ['code', 'name', 'createdAt', 'modifiedAt'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COUNTRY_CODE_REGEX = /^[A-Z]{2,3}$/;
const MAX_NAME_LENGTH = 100;

function assertValidUuid(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new BadRequestError(MessageCode.INVALID_INPUT, { reason: 'id must be a valid UUID' });
  }
}

function toCountryResponse(c: { id: string; code: string; name: string; isActive: boolean; createdAt: string; modifiedAt: string }) {
  return { id: c.id, code: c.code, name: c.name, isActive: c.isActive, createdAt: c.createdAt, modifiedAt: c.modifiedAt };
}

export class CountryController {
  constructor(
    private readonly createCountryUseCase: CreateCountryUseCase,
    private readonly getAllCountriesUseCase: GetAllCountriesUseCase,
    private readonly getCountryByIdUseCase: GetCountryByIdUseCase,
    private readonly updateCountryUseCase: UpdateCountryUseCase,
    private readonly deleteCountryUseCase: DeleteCountryUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<Response> => {
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!code || !name) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'code and name' }));
    }
    if (!COUNTRY_CODE_REGEX.test(code)) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: 'code must be 2-3 uppercase letters' }));
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: `name exceeds ${MAX_NAME_LENGTH} characters` }));
    }

    const country = await this.createCountryUseCase.execute({ code, name });
    return res.status(201).json(success(toCountryResponse(country), MessageCode.CREATED, { resource: 'Country' }));
  };

  getAll = async (req: Request, res: Response): Promise<Response> => {
    const pagination = parsePaginationFromQuery(req.query as Record<string, unknown>, {
      allowedSortFields: ALLOWED_SORT_FIELDS,
    });
    const result = await this.getAllCountriesUseCase.execute({ pagination });
    const data = result.items.map(toCountryResponse);
    return res.status(200).json(successPaginated(data, result.meta, MessageCode.LIST_FETCHED, { resource: 'Country' }));
  };

  getById = async (req: Request, res: Response): Promise<Response> => {
    assertValidUuid(req.params.id);
    const country = await this.getCountryByIdUseCase.execute(req.params.id);
    if (!country) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Country' });
    return res.status(200).json(success(toCountryResponse(country), MessageCode.FETCHED, { resource: 'Country' }));
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    assertValidUuid(req.params.id);
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : undefined;
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;

    if (!code && !name) {
      return res.status(400).json(error(MessageCode.FIELD_REQUIRED, { field: 'code or name' }));
    }
    if (code !== undefined && !COUNTRY_CODE_REGEX.test(code)) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: 'code must be 2-3 uppercase letters' }));
    }
    if (name !== undefined && name.length > MAX_NAME_LENGTH) {
      return res.status(400).json(error(MessageCode.INVALID_INPUT, { reason: `name exceeds ${MAX_NAME_LENGTH} characters` }));
    }

    const country = await this.updateCountryUseCase.execute(req.params.id, { code, name });
    if (!country) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Country' });
    return res.status(200).json(success(toCountryResponse(country), MessageCode.UPDATED, { resource: 'Country' }));
  };

  delete = async (req: Request, res: Response): Promise<Response> => {
    assertValidUuid(req.params.id);
    const deleted = await this.deleteCountryUseCase.execute(req.params.id);
    if (!deleted) throw new NotFoundError(MessageCode.NOT_FOUND, { resource: 'Country' });
    return res.status(200).json(success(undefined, MessageCode.DELETED, { resource: 'Country' }));
  };
}
