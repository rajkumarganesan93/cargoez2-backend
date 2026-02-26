import {
  zodToSwagger,
  SwaggerSuccessResponse,
  SwaggerErrorResponse,
  SwaggerPaginationMeta,
  SwaggerPaginationParams,
} from '@rajkumarganesan93/infrastructure';
import { CreateUserBody, UpdateUserBody, UserResponse } from '../models/user.models.js';

const UserSchema = zodToSwagger(UserResponse);
const CreateUserInputSchema = zodToSwagger(CreateUserBody);
const UpdateUserInputSchema = zodToSwagger(UpdateUserBody);

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'User Service API',
    version: '1.2.0',
    description:
      'Manages users in the cargoez-be platform. ' +
      'All responses follow a standard envelope with `success`, `messageCode`, `message`, and `data`/`error`.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Users', description: 'User CRUD operations' },
  ],
  components: {
    schemas: {
      User: UserSchema,
      CreateUserInput: CreateUserInputSchema,
      UpdateUserInput: UpdateUserInputSchema,
      PaginationMeta: SwaggerPaginationMeta,
      SuccessResponse: SwaggerSuccessResponse,
      ErrorResponse: SwaggerErrorResponse,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns service health status.',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (paginated)',
        description: 'Returns a paginated list of active users. Supports sorting by any entity field.',
        parameters: SwaggerPaginationParams,
        responses: {
          '200': {
            description: 'Paginated list of users (messageCode: LIST_FETCHED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '500': {
            description: 'Internal server error (messageCode: INTERNAL_ERROR)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a new user',
        description: 'Creates a user with the given name and email. Email must be unique. Request body is validated automatically.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserInput' } } },
        },
        responses: {
          '201': {
            description: 'User created (messageCode: CREATED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Validation failed (messageCode: VALIDATION_FAILED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Email already in use (messageCode: DUPLICATE_EMAIL)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
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
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Invalid UUID (messageCode: INVALID_INPUT)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update a user',
        description: 'Updates user fields. At least one of name or email must be provided. Both id and body are validated automatically.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'User UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserInput' } } },
        },
        responses: {
          '200': {
            description: 'User updated (messageCode: UPDATED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
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
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user',
        description: 'Soft-deletes a user by UUID (sets isActive to false). The id parameter is validated automatically.',
        parameters: [
          { in: 'path', name: 'id', required: true, description: 'User UUID', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'User deleted (messageCode: DELETED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Invalid UUID (messageCode: INVALID_INPUT)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
  },
};
