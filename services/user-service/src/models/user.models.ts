import { z } from 'zod';

export const CreateUserBody = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
  email: z.string().trim().toLowerCase().min(1, 'email is required').max(150)
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'invalid email format' }),
});
export type CreateUserBody = z.infer<typeof CreateUserBody>;

export const UpdateUserBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().max(150)
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'invalid email format' })
    .optional(),
}).refine((data) => data.name !== undefined || data.email !== undefined, {
  message: 'At least one of name or email is required',
});
export type UpdateUserBody = z.infer<typeof UpdateUserBody>;

export const IdParams = z.object({
  id: z.string().refine((val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
    message: 'id must be a valid UUID',
  }),
});
export type IdParams = z.infer<typeof IdParams>;

export const UserResponse = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});
export type UserResponse = z.infer<typeof UserResponse>;
