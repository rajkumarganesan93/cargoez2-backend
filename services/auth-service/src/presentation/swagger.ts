export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Auth Service API',
    version: '1.0.0',
    description:
      'Auth service (master_db). Login, token generation, register, and token validation APIs.',
  },
  servers: [{ url: 'http://localhost:3003', description: 'Auth service' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password',
        description:
          'Validates credentials and returns an access token for API authentication.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful, returns token and user info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: {
                      type: 'string',
                      description: 'Bearer token for Authorization header',
                    },
                    expiresAt: { type: 'string', format: 'date-time' },
                    userId: { type: 'string', format: 'uuid' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Bad request - email and password required' },
          '401': { description: 'Invalid email or password' },
          '500': { description: 'Internal server error' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  roleName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Bad request' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/auth/validate': {
      get: {
        summary: 'Validate a token',
        parameters: [
          {
            in: 'header',
            name: 'Authorization',
            schema: { type: 'string', example: 'Bearer <token>' },
          },
          {
            in: 'query',
            name: 'token',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Token valid' },
          '401': { description: 'Token invalid or expired' },
        },
      },
    },
  },
};
