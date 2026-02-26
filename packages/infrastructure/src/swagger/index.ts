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

/**
 * Build an OpenAPI response schema that shows the full entity shape inside
 * the standard success envelope. Swagger "Try it out" renders the example
 * so developers see exactly what the API returns.
 */
export function SwaggerTypedSuccessResponse(
  dataSchema: Record<string, unknown>,
  example?: Record<string, unknown>,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      messageCode: { type: 'string', example: 'FETCHED' },
      message: { type: 'string', example: 'Resource fetched successfully' },
      data: dataSchema,
      timestamp: { type: 'string', format: 'date-time' },
    },
  };
  if (example) {
    schema.example = {
      success: true,
      messageCode: 'FETCHED',
      message: 'Resource fetched successfully',
      data: example,
      timestamp: '2026-02-26T00:00:00.000Z',
    };
  }
  return schema;
}

/**
 * Build an OpenAPI response schema for paginated list endpoints.
 * Shows the entity array inside `data.items` and pagination meta.
 */
export function SwaggerTypedPaginatedResponse(
  itemSchema: Record<string, unknown>,
  itemExample?: Record<string, unknown>,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      messageCode: { type: 'string', example: 'LIST_FETCHED' },
      message: { type: 'string', example: 'Resource list fetched successfully' },
      data: {
        type: 'object',
        properties: {
          items: { type: 'array', items: itemSchema },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 50 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              totalPages: { type: 'integer', example: 3 },
            },
          },
        },
      },
      timestamp: { type: 'string', format: 'date-time' },
    },
  };
  if (itemExample) {
    schema.example = {
      success: true,
      messageCode: 'LIST_FETCHED',
      message: 'Resource list fetched successfully',
      data: {
        items: [itemExample],
        meta: { total: 50, page: 1, limit: 20, totalPages: 3 },
      },
      timestamp: '2026-02-26T00:00:00.000Z',
    };
  }
  return schema;
}

/**
 * Build an OpenAPI request body with schema and a pre-filled example
 * so Swagger "Try it out" shows realistic values, not just "string".
 */
export function SwaggerRequestBody(
  schema: Record<string, unknown> | { $ref: string },
  example?: Record<string, unknown>,
): Record<string, unknown> {
  const mediaType: Record<string, unknown> = { schema };
  if (example) mediaType.example = example;
  return {
    required: true,
    content: { 'application/json': mediaType },
  };
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

/**
 * OpenAPI 3.0 security scheme for JWT Bearer authentication.
 * Add to your swagger spec under `components.securitySchemes`.
 *
 * Usage in swagger.ts:
 *   components: {
 *     securitySchemes: { BearerAuth: SwaggerBearerAuth },
 *   },
 *   security: [SwaggerSecurityRequirement],
 */
export const SwaggerBearerAuth = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Keycloak JWT access token. Click "Authorize" and paste your token.',
};

/**
 * Global security requirement for Swagger specs.
 * Apply at the spec root to require auth on all endpoints.
 * Individual endpoints can override with `security: []` to make them public.
 */
export const SwaggerSecurityRequirement = { BearerAuth: [] };

/**
 * Swagger 401 and 403 response definitions for protected endpoints.
 */
export const SwaggerAuthResponses = {
  '401': {
    description: 'Unauthorized — missing or invalid Bearer token (messageCode: UNAUTHORIZED)',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
  },
  '403': {
    description: 'Forbidden — insufficient role/permissions (messageCode: FORBIDDEN)',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
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
