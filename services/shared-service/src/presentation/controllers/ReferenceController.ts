import { Request, Response } from 'express';
import { GetCountriesUseCase } from '../../application/use-cases/GetCountriesUseCase.js';
import { GetCountryByCodeUseCase } from '../../application/use-cases/GetCountryByCodeUseCase.js';

export class ReferenceController {
  constructor(
    private readonly getCountriesUseCase: GetCountriesUseCase,
    private readonly getCountryByCodeUseCase: GetCountryByCodeUseCase
  ) {}

  getCountries = async (_req: Request, res: Response): Promise<Response> => {
    const countries = await this.getCountriesUseCase.execute();
    return res.status(200).json(
      countries.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  };

  getCountryByCode = async (req: Request, res: Response): Promise<Response> => {
    const { code } = req.params;
    const country = await this.getCountryByCodeUseCase.execute(code);
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }
    return res.status(200).json({
      id: country.id,
      code: country.code,
      name: country.name,
      createdAt: country.createdAt.toISOString(),
    });
  };
}
