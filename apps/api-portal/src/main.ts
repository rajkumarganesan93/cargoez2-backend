import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env') });

const SERVICES = [
  { name: 'User Service', url: `http://localhost:${process.env['USER_SERVICE_PORT'] || 3001}/user-service/api-docs/json` },
  { name: 'Shared DB Example', url: `http://localhost:${process.env['SHARED_DB_SERVICE_PORT'] || 3005}/shared-db-example/api-docs/json` },
];

async function fetchSwaggerDocs(): Promise<any> {
  const merged: any = {
    openapi: '3.0.0',
    info: { title: 'CargoEz API Portal', description: 'Aggregated API documentation for all microservices', version: '1.0.0' },
    paths: {},
    components: { schemas: {}, securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    security: [{ bearer: [] }],
    tags: [],
  };

  for (const service of SERVICES) {
    try {
      const response = await fetch(service.url);
      if (!response.ok) continue;
      const doc: any = await response.json();

      if (doc.paths) {
        Object.assign(merged.paths, doc.paths);
      }
      if (doc.components?.schemas) {
        Object.assign(merged.components.schemas, doc.components.schemas);
      }
      if (doc.tags) {
        merged.tags.push(...doc.tags);
      }
    } catch (err) {
      console.warn(`Failed to fetch docs from ${service.name}: ${err}`);
    }
  }

  return merged;
}

async function bootstrap() {
  const app = express();
  app.use(cors());

  let swaggerDoc = await fetchSwaggerDocs();

  app.get('/api-docs/json', (_req, res) => res.json(swaggerDoc));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
    customSiteTitle: 'CargoEz API Portal',
    explorer: true,
    swaggerUrl: '/api-docs/json',
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-portal', timestamp: new Date().toISOString() });
  });

  setInterval(async () => {
    try {
      swaggerDoc = await fetchSwaggerDocs();
    } catch {}
  }, 30000);

  const port = process.env['API_PORTAL_PORT'] || 4000;
  app.listen(port, () => {
    console.log(`API Portal running on http://localhost:${port}`);
    console.log(`Swagger UI: http://localhost:${port}/api-docs`);
  });
}

bootstrap();
