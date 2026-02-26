import { z, BaseEntitySchema } from '@rajkumarganesan93/infrastructure';

/**
 * Single source-of-truth schema for the User entity.
 * All request/response schemas are derived from this base model.
 */
export const UserModel = BaseEntitySchema.extend({
  name: z.string().trim().min(1, 'name is required').max(100),
  email: z.string().trim().toLowerCase().min(1, 'email is required').max(150)
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'invalid email format' }),
});
export type UserModel = z.infer<typeof UserModel>;

export const CreateUserBody = UserModel.pick({ name: true, email: true });
export type CreateUserBody = z.infer<typeof CreateUserBody>;

export const UpdateUserBody = UserModel.pick({ name: true, email: true }).partial()
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'At least one of name or email is required',
  });
export type UpdateUserBody = z.infer<typeof UpdateUserBody>;

export const UserResponse = UserModel;
export type UserResponse = z.infer<typeof UserResponse>;

export const EXAMPLE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'John Doe',
  email: 'john@example.com',
  isActive: true,
  createdAt: '2026-02-26T00:00:00.000Z',
  modifiedAt: '2026-02-26T00:00:00.000Z',
};
