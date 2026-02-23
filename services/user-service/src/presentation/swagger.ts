export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'User Service API',
    version: '1.0.0',
    description: 'User service for cargoez-be',
  },
  servers: [{ url: 'http://localhost:3001', description: 'User service' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },
    '/users': {
      get: {
        summary: 'Get all users',
        responses: {
          '200': { description: 'List of users' },
          '500': { description: 'Internal server error' },
        },
      },
      post: {
        summary: 'Create a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created successfully' },
          '400': { description: 'Bad request - name and email required' },
          '409': { description: 'User with email already exists' },
          '500': { description: 'Internal server error' },
        },
      },
    },
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'User found' },
          '404': { description: 'User not found' },
          '500': { description: 'Internal server error' },
        },
      },
      put: {
        summary: 'Update a user',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User updated successfully' },
          '400': { description: 'Bad request - at least name or email required' },
          '404': { description: 'User not found' },
          '409': { description: 'Email already in use' },
          '500': { description: 'Internal server error' },
        },
      },
      delete: {
        summary: 'Delete a user',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '204': { description: 'User deleted successfully' },
          '404': { description: 'User not found' },
          '500': { description: 'Internal server error' },
        },
      },
    },
  },
};
