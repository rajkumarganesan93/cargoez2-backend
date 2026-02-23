import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shared Service API',
      version: '1.0.0',
      description: 'Shared/reference data service for cargoez-be',
    },
    servers: [{ url: 'http://localhost:3004', description: 'Shared service' }],
  },
  apis: [
    path.join(__dirname, 'routes.js'),
    path.join(__dirname, 'routes.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
