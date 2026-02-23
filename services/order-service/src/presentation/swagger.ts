import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API',
      version: '1.0.0',
      description: 'Order service for cargoez-be',
    },
    servers: [{ url: 'http://localhost:3002', description: 'Order service' }],
  },
  apis: [
    path.join(__dirname, 'routes.js'),
    path.join(__dirname, 'routes.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
