import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reusable UUID path-parameter schema.
 * Services import this instead of defining their own IdParams.
 */
export const IdParams = z.object({
  id: z.string().refine((val) => UUID_REGEX.test(val), {
    message: 'id must be a valid UUID',
  }),
});
export type IdParams = z.infer<typeof IdParams>;

/**
 * Zod schema for the common BaseEntity audit fields.
 * Use `.merge(BaseEntitySchema)` or `.extend(BaseEntitySchema.shape)` when
 * building entity response schemas so all share a single source of truth.
 */
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string(),
  modifiedAt: z.string(),
});
export type BaseEntitySchema = z.infer<typeof BaseEntitySchema>;
