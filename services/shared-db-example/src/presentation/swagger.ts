const SuccessResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    messageCode: { type: 'string', example: 'FETCHED' },
    message: { type: 'string', example: 'Country fetched successfully' },
    data: { type: 'object' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

const PaginatedResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    messageCode: { type: 'string', example: 'LIST_FETCHED' },
    message: { type: 'string', example: 'Country list fetched successfully' },
    data: { type: 'array', items: { $ref: '#/components/schemas/Country' } },
    meta: { $ref: '#/components/schemas/PaginationMeta' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

const ErrorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    messageCode: { type: 'string', example: 'NOT_FOUND' },
    error: { type: 'string', example: 'Country not found' },
    statusCode: { type: 'integer', example: 404 },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Shared DB Example API',
    version: '1.1.0',
    description:
      'Example service demonstrating shared database access (master_db). ' +
      'All responses follow a standard envelope with `success`, `messageCode`, `message`, and `data`/`error`.',
  },
  servers: [{ url: 'http://localhost:3005', description: 'Local development' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Countries', description: 'Country CRUD operations' },
  ],
  components: {
    schemas: {
      Country: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string', maxLength: 3, example: 'US' },
          name: { type: 'string', example: 'United States' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          modifiedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateCountryInput: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', maxLength: 3, example: 'US' },
          name: { type: 'string', example: 'United States' },
        },
      },
      UpdateCountryInput: {
        type: 'object',
        properties: {
          code: { type: 'string', maxLength: 3, example: 'IN' },
          name: { type: 'string', example: 'India' },
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
    '/countries': {
      get: {
        tags: ['Countries'],
        summary: 'List all countries (paginated)',
        description:
          'Returns a paginated list of active countries. Supports sorting by any entity field.',
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
            description: 'Entity field to sort by (e.g. code, name, createdAt)',
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
            description: 'Paginated list of countries',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } },
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      post: {
        tags: ['Countries'],
        summary: 'Create a new country',
        description: 'Creates a country with the given code and name. Code must be unique.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateCountryInput' } },
          },
        },
        responses: {
          '201': {
            description: 'Country created (messageCode: CREATED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Missing required fields (messageCode: FIELD_REQUIRED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Country code already exists (messageCode: DUPLICATE_ENTRY)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '500': {
            description: 'Internal server error (messageCode: INTERNAL_ERROR)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/countries/{id}': {
      get: {
        tags: ['Countries'],
        summary: 'Get country by ID',
        description: 'Returns a single country by its UUID.',
        parameters: [
          {
            in: 'path', name: 'id', required: true,
            description: 'Country UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Country found (messageCode: FETCHED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '404': {
            description: 'Country not found (messageCode: NOT_FOUND)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      put: {
        tags: ['Countries'],
        summary: 'Update a country',
        description: 'Updates country fields. At least one of code or name must be provided.',
        parameters: [
          {
            in: 'path', name: 'id', required: true,
            description: 'Country UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateCountryInput' } },
          },
        },
        responses: {
          '200': {
            description: 'Country updated (messageCode: UPDATED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '400': {
            description: 'Missing required fields (messageCode: FIELD_REQUIRED)',
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
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      delete: {
        tags: ['Countries'],
        summary: 'Delete a country',
        description: 'Soft-deletes a country by UUID (sets isActive to false).',
        parameters: [
          {
            in: 'path', name: 'id', required: true,
            description: 'Country UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Country deleted (messageCode: DELETED)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
          },
          '404': {
            description: 'Country not found (messageCode: NOT_FOUND)',
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
