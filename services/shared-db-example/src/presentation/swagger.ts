export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Shared DB Example API',
    version: '1.0.0',
    description: 'Example service demonstrating shared database access (master_db)',
  },
  servers: [{ url: 'http://localhost:3005', description: 'Shared DB Example' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/countries': {
      get: {
        summary: 'Get all countries (paginated)',
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
          { in: 'query', name: 'sortBy', schema: { type: 'string' } },
          { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          '200': { description: 'Paginated list of countries' },
          '500': { description: 'Internal server error' },
        },
      },
      post: {
        summary: 'Create a new country',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name'],
                properties: {
                  code: { type: 'string', maxLength: 3 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Country created' },
          '400': { description: 'Bad request' },
          '409': { description: 'Country with code already exists' },
          '500': { description: 'Internal server error' },
        },
      },
    },
    '/countries/{id}': {
      get: {
        summary: 'Get country by ID',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Country found' },
          '404': { description: 'Country not found' },
          '500': { description: 'Internal server error' },
        },
      },
      put: {
        summary: 'Update a country',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  code: { type: 'string', maxLength: 3 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Country updated' },
          '400': { description: 'Bad request' },
          '404': { description: 'Country not found' },
          '409': { description: 'Country code already in use' },
          '500': { description: 'Internal server error' },
        },
      },
      delete: {
        summary: 'Delete a country',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Country deleted' },
          '404': { description: 'Country not found' },
          '500': { description: 'Internal server error' },
        },
      },
    },
  },
};
