import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';

/**
 * Convert a zod schema to an OpenAPI 3.0-compatible schema object.
 * Strips the top-level `$schema` and `$ref` wrappers that zod-to-json-schema adds.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToSwagger(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema as any, { target: 'openApi3' });
  const { $schema: _, ...rest } = jsonSchema as Record<string, unknown>;
  return rest;
}

export const SwaggerSuccessResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    messageCode: { type: 'string', example: 'FETCHED' },
    message: { type: 'string', example: 'Resource fetched successfully' },
    data: { type: 'object' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const SwaggerErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    messageCode: { type: 'string', example: 'NOT_FOUND' },
    error: { type: 'string', example: 'Resource not found' },
    statusCode: { type: 'integer', example: 404 },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const SwaggerPaginationMeta = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 50 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    totalPages: { type: 'integer', example: 3 },
  },
};

export const SwaggerPaginatedResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    messageCode: { type: 'string', example: 'LIST_FETCHED' },
    message: { type: 'string', example: 'Resource list fetched successfully' },
    data: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        meta: { $ref: '#/components/schemas/PaginationMeta' },
      },
    },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const SwaggerPaginationParams = [
  {
    in: 'query', name: 'page',
    description: 'Page number (1-based)',
    schema: { type: 'integer', default: 1, minimum: 1 },
  },
  {
    in: 'query', name: 'limit',
    description: 'Items per page (max 100)',
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
  },
  {
    in: 'query', name: 'sortBy',
    description: 'Field to sort by',
    schema: { type: 'string', default: 'createdAt' },
  },
  {
    in: 'query', name: 'sortOrder',
    description: 'Sort direction',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
  },
];
