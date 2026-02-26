import { z } from 'zod';

export const CreateCountryBody = z.object({
  code: z.string().trim().toUpperCase().min(2, 'code must be 2-3 uppercase letters').max(3)
    .refine((val) => /^[A-Z]{2,3}$/.test(val), { message: 'code must be 2-3 uppercase letters' }),
  name: z.string().trim().min(1, 'name is required').max(100),
});
export type CreateCountryBody = z.infer<typeof CreateCountryBody>;

export const UpdateCountryBody = z.object({
  code: z.string().trim().toUpperCase().max(3)
    .refine((val) => /^[A-Z]{2,3}$/.test(val), { message: 'code must be 2-3 uppercase letters' })
    .optional(),
  name: z.string().trim().min(1).max(100).optional(),
}).refine((data) => data.code !== undefined || data.name !== undefined, {
  message: 'At least one of code or name is required',
});
export type UpdateCountryBody = z.infer<typeof UpdateCountryBody>;

export const IdParams = z.object({
  id: z.string().refine((val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
    message: 'id must be a valid UUID',
  }),
});
export type IdParams = z.infer<typeof IdParams>;

export const CountryResponse = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});
export type CountryResponse = z.infer<typeof CountryResponse>;
