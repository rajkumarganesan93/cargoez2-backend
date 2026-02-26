import { z, BaseEntitySchema } from '@rajkumarganesan93/infrastructure';

/**
 * Single source-of-truth schema for the Country entity.
 * All request/response schemas are derived from this base model.
 */
export const CountryModel = BaseEntitySchema.extend({
  code: z.string().trim().toUpperCase().min(2, 'code must be 2-3 uppercase letters').max(3)
    .refine((val) => /^[A-Z]{2,3}$/.test(val), { message: 'code must be 2-3 uppercase letters' }),
  name: z.string().trim().min(1, 'name is required').max(100),
});
export type CountryModel = z.infer<typeof CountryModel>;

export const CreateCountryBody = CountryModel.pick({ code: true, name: true });
export type CreateCountryBody = z.infer<typeof CreateCountryBody>;

export const UpdateCountryBody = CountryModel.pick({ code: true, name: true }).partial()
  .refine((data) => data.code !== undefined || data.name !== undefined, {
    message: 'At least one of code or name is required',
  });
export type UpdateCountryBody = z.infer<typeof UpdateCountryBody>;

export const CountryResponse = CountryModel;
export type CountryResponse = z.infer<typeof CountryResponse>;

export const EXAMPLE_COUNTRY = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  code: 'IN',
  name: 'India',
  isActive: true,
  createdAt: '2026-02-26T00:00:00.000Z',
  modifiedAt: '2026-02-26T00:00:00.000Z',
};
