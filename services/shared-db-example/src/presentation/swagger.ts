import {
  zodToSwagger,
  SwaggerTypedSuccessResponse,
  SwaggerTypedPaginatedResponse,
  SwaggerRequestBody,
  SwaggerErrorResponse,
  SwaggerPaginationParams,
  SwaggerBearerAuth,
  SwaggerSecurityRequirement,
  SwaggerAuthResponses,
} from '@rajkumarganesan93/infrastructure';
import { CreateCountryBody, UpdateCountryBody, CountryResponse, EXAMPLE_COUNTRY } from './models/country.models.js';

const CountrySchema = zodToSwagger(CountryResponse);
const CreateCountryInputSchema = zodToSwagger(CreateCountryBody);
const UpdateCountryInputSchema = zodToSwagger(UpdateCountryBody);

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Shared DB Example API',
    version: '2.0.0',
    description:
      'Example service demonstrating shared database access (master_db). ' +
      'All responses follow a standard envelope with `success`, `messageCode`, `message`, and `data`/`error`. ' +
      'Use "Try it out" to see pre-filled request bodies and full response shapes.',
  },
  servers: [{ url: 'http://localhost:3005', description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Countries', description: 'Country CRUD operations' },
  ],
  security: [SwaggerSecurityRequirement],
  components: {
    securitySchemes: {
      BearerAuth: SwaggerBearerAuth,
    },
    schemas: {
      Country: CountrySchema,
      CreateCountryInput: CreateCountryInputSchema,
      UpdateCountryInput: UpdateCountryInputSchema,
      ErrorResponse: SwaggerErrorResponse,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns service health status.',
        security: [],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse({ type: 'object', properties: { status: { type: 'string', example: 'ok' } } }),
              },
            },
          },
        },
      },
    },
    '/countries': {
      get: {
        tags: ['Countries'],
        summary: 'List all countries (paginated)',
        description: 'Returns a paginated list of active countries. Supports sorting by code, name, createdAt, modifiedAt.',
        parameters: SwaggerPaginationParams,
        responses: {
          '200': {
            description: 'Paginated list of countries (messageCode: LIST_FETCHED)',
            content: {
              'application/json': {
                schema: SwaggerTypedPaginatedResponse(CountrySchema, EXAMPLE_COUNTRY),
              },
            },
          },
          ...SwaggerAuthResponses,
          '500': {
            description: 'Internal server error (messageCode: INTERNAL_ERROR)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      post: {
        tags: ['Countries'],
        summary: 'Create a new country',
        description: 'Creates a country with the given code and name. Code must be unique. Requires **admin** role.',
        requestBody: SwaggerRequestBody(
          { $ref: '#/components/schemas/CreateCountryInput' },
          { code: 'IN', name: 'India' },
        ),
        responses: {
          '201': {
            description: 'Country created (messageCode: CREATED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(CountrySchema, EXAMPLE_COUNTRY),
              },
            },
          },
          '422': {
            description: 'Validation failed (messageCode: VALIDATION_FAILED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Country code already exists (messageCode: DUPLICATE_ENTRY)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
    },
    '/countries/{id}': {
      get: {
        tags: ['Countries'],
        summary: 'Get country by ID',
        description: 'Returns a single country by its UUID. The id parameter is validated automatically.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'Country UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Country found (messageCode: FETCHED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(CountrySchema, EXAMPLE_COUNTRY),
              },
            },
          },
          '422': {
            description: 'Invalid UUID (messageCode: INVALID_INPUT)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'Country not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
      put: {
        tags: ['Countries'],
        summary: 'Update a country',
        description: 'Updates country fields. At least one of code or name must be provided. Requires **admin** or **manager** role.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'Country UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: SwaggerRequestBody(
          { $ref: '#/components/schemas/UpdateCountryInput' },
          { name: 'Bharat' },
        ),
        responses: {
          '200': {
            description: 'Country updated (messageCode: UPDATED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(CountrySchema, { ...EXAMPLE_COUNTRY, name: 'Bharat' }),
              },
            },
          },
          '422': {
            description: 'Validation failed (messageCode: VALIDATION_FAILED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'Country not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Country code already in use (messageCode: DUPLICATE_ENTRY)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
      delete: {
        tags: ['Countries'],
        summary: 'Delete a country (soft-delete)',
        description: 'Soft-deletes a country by UUID (sets isActive to false). Requires **admin** role.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'Country UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Country deleted (messageCode: DELETED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(
                  { type: 'object', nullable: true },
                  undefined,
                ),
              },
            },
          },
          '422': {
            description: 'Invalid UUID (messageCode: INVALID_INPUT)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'Country not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
    },
  },
};
