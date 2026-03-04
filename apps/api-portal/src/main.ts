import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env') });

const USER_SERVICE_PORT = process.env['USER_SERVICE_PORT'] || 3001;
const SHARED_DB_SERVICE_PORT = process.env['SHARED_DB_SERVICE_PORT'] || 3005;
const PORTAL_PORT = process.env['API_PORTAL_PORT'] || 4000;

const SERVICES = [
  { name: 'User Service', slug: 'user-service', prefix: '/user-service', target: `http://localhost:${USER_SERVICE_PORT}`, docsUrl: `http://localhost:${USER_SERVICE_PORT}/user-service/api-docs/json` },
  { name: 'Shared DB Example', slug: 'shared-db-example', prefix: '/shared-db-example', target: `http://localhost:${SHARED_DB_SERVICE_PORT}`, docsUrl: `http://localhost:${SHARED_DB_SERVICE_PORT}/shared-db-example/api-docs/json` },
];

async function fetchServiceDoc(service: typeof SERVICES[number]): Promise<any | null> {
  try {
    const response = await fetch(service.docsUrl);
    if (!response.ok) return null;
    const doc: any = await response.json();
    doc.servers = [{ url: `http://localhost:${PORTAL_PORT}`, description: 'API Portal (proxied)' }];
    return doc;
  } catch (err) {
    console.warn(`Failed to fetch docs from ${service.name}: ${err}`);
    return null;
  }
}

async function bootstrap() {
  const app = express();
  app.use(cors());

  for (const service of SERVICES) {
    app.use(createProxyMiddleware({
      target: service.target,
      pathFilter: (path) => path.startsWith(service.prefix) && !path.includes('/api-docs'),
      changeOrigin: true,
    }));
  }

  for (const service of SERVICES) {
    app.get(`/api-docs/${service.slug}.json`, async (_req, res) => {
      const doc = await fetchServiceDoc(service);
      if (!doc) return res.status(503).json({ error: `${service.name} is unavailable` });
      res.json(doc);
    });
  }

  const swaggerUrls = SERVICES.map((s) => ({
    url: `/api-docs/${s.slug}.json`,
    name: s.name,
  }));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
    customSiteTitle: 'CargoEz API Portal',
    explorer: true,
    swaggerOptions: {
      urls: swaggerUrls,
      'urls.primaryName': SERVICES[0].name,
    },
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-portal', timestamp: new Date().toISOString() });
  });

  const port = PORTAL_PORT;
  app.listen(port, () => {
    console.log(`API Portal running on http://localhost:${port}`);
    console.log(`Swagger UI: http://localhost:${port}/api-docs`);
  });
}

bootstrap();
