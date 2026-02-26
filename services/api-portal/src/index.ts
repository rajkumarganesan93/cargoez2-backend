import express from 'express';
import swaggerUi from 'swagger-ui-express';

const PORT = process.env.PORT ?? 4000;

const SERVICE_URLS = [
  { url: 'http://localhost:3001/api-docs/json', name: 'User Service' },
  { url: 'http://localhost:3005/api-docs/json', name: 'Shared DB Example' },
];

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-portal' });
});

app.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(null, {
    explorer: true,
    swaggerOptions: {
      urls: SERVICE_URLS,
    },
    customSiteTitle: 'CargoEz API Portal',
  }),
);

app.listen(PORT, () => {
  console.log(`API Portal running at http://localhost:${PORT}`);
  console.log('Available services:');
  SERVICE_URLS.forEach((s) => console.log(`  - ${s.name}: ${s.url}`));
});
