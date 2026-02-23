const SuccessResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    messageCode: { type: 'string', example: 'FETCHED' },
    message: { type: 'string', example: 'User fetched successfully' },
    data: { type: 'object' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

const PaginatedResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    messageCode: { type: 'string', example: 'LIST_FETCHED' },
    message: { type: 'string', example: 'User list fetched successfully' },
    data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
    meta: { $ref: '#/components/schemas/PaginationMeta' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

const ErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    messageCode: { type: 'string', example: 'NOT_FOUND' },
    error: { type: 'string', example: 'User not found' },
    statusCode: { type: 'integer', example: 404 },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'User Service API',
    version: '1.1.0',
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
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          modifiedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUserInput: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
        },
      },
      UpdateUserInput: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 50 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      SuccessResponse,
      PaginatedResponse,
      ErrorResponse,
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
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { status: { type: 'string', example: 'ok' } },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
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
        description:
          'Returns a paginated list of active users. Supports sorting by any entity field.',
        parameters: [
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
            description: 'Entity field to sort by (e.g. name, email, createdAt)',
            schema: { type: 'string', default: 'createdAt' },
          },
          {
            in: 'query', name: 'sortOrder',
            description: 'Sort direction',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of users',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } },
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a new user',
        description: 'Creates a user with the given name and email. Email must be unique.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUserInput' } },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully (messageCode: CREATED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Missing required fields (messageCode: FIELD_REQUIRED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Email already in use (messageCode: DUPLICATE_EMAIL)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '500': {
            description: 'Internal server error (messageCode: INTERNAL_ERROR)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Returns a single user by their UUID.',
        parameters: [
          {
            in: 'path', name: 'id', required: true,
            description: 'User UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'User found (messageCode: FETCHED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '404': {
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update a user',
        description: 'Updates user fields. At least one of name or email must be provided.',
        parameters: [
          {
            in: 'path', name: 'id', required: true,
            description: 'User UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUserInput' } },
          },
        },
        responses: {
          '200': {
            description: 'User updated (messageCode: UPDATED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Missing required fields (messageCode: FIELD_REQUIRED)',
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
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user',
        description: 'Soft-deletes a user by UUID (sets isActive to false).',
        parameters: [
          {
            in: 'path', name: 'id', required: true,
            description: 'User UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'User deleted (messageCode: DELETED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '404': {
            description: 'User not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
  },
};
