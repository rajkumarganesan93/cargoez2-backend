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
import { CreateUserBody, UpdateUserBody, UserResponse, EXAMPLE_USER } from './models/user.models.js';

const UserSchema = zodToSwagger(UserResponse);
const CreateUserInputSchema = zodToSwagger(CreateUserBody);
const UpdateUserInputSchema = zodToSwagger(UpdateUserBody);

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'User Service API',
    version: '2.0.0',
    description:
      'Manages users in the cargoez-be platform. ' +
      'All responses follow a standard envelope with `success`, `messageCode`, `message`, and `data`/`error`. ' +
      'Use "Try it out" to see pre-filled request bodies and full response shapes.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Users', description: 'User CRUD operations' },
  ],
  security: [SwaggerSecurityRequirement],
  components: {
    securitySchemes: {
      BearerAuth: SwaggerBearerAuth,
    },
    schemas: {
      User: UserSchema,
      CreateUserInput: CreateUserInputSchema,
      UpdateUserInput: UpdateUserInputSchema,
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
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (paginated)',
        description: 'Returns a paginated list of active users. Supports sorting by name, email, createdAt, modifiedAt.',
        parameters: SwaggerPaginationParams,
        responses: {
          '200': {
            description: 'Paginated list of users (messageCode: LIST_FETCHED)',
            content: {
              'application/json': {
                schema: SwaggerTypedPaginatedResponse(UserSchema, EXAMPLE_USER),
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
        tags: ['Users'],
        summary: 'Create a new user',
        description: 'Creates a user with the given name and email. Email must be unique. Requires **admin** role.',
        requestBody: SwaggerRequestBody(
          { $ref: '#/components/schemas/CreateUserInput' },
          { name: 'John Doe', email: 'john@example.com' },
        ),
        responses: {
          '201': {
            description: 'User created (messageCode: CREATED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(UserSchema, EXAMPLE_USER),
              },
            },
          },
          '422': {
            description: 'Validation failed (messageCode: VALIDATION_FAILED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Email already in use (messageCode: DUPLICATE_EMAIL)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Returns a single user by their UUID. The id parameter is validated automatically.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'User UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'User found (messageCode: FETCHED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(UserSchema, EXAMPLE_USER),
              },
            },
          },
          '422': {
            description: 'Invalid UUID (messageCode: INVALID_INPUT)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update a user',
        description: 'Updates user fields. At least one of name or email must be provided. Requires **admin** or **manager** role.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'User UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: SwaggerRequestBody(
          { $ref: '#/components/schemas/UpdateUserInput' },
          { name: 'Jane Doe' },
        ),
        responses: {
          '200': {
            description: 'User updated (messageCode: UPDATED)',
            content: {
              'application/json': {
                schema: SwaggerTypedSuccessResponse(UserSchema, { ...EXAMPLE_USER, name: 'Jane Doe' }),
              },
            },
          },
          '422': {
            description: 'Validation failed (messageCode: VALIDATION_FAILED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Email already in use (messageCode: DUPLICATE_EMAIL)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user (soft-delete)',
        description: 'Soft-deletes a user by UUID (sets isActive to false). Requires **admin** role.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'User UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'User deleted (messageCode: DELETED)',
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
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          ...SwaggerAuthResponses,
        },
      },
    },
  },
};
