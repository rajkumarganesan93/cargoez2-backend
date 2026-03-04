import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { config } from 'dotenv';
import { AppModule } from './app/app.module';
import { GlobalExceptionFilter, PinoLoggerService, ContextInterceptor } from '@cargoez/infrastructure';

config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new PinoLoggerService();
  app.useLogger(logger);
  app.enableCors();
  app.setGlobalPrefix('shared-db-example');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ContextInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shared DB Example Service')
    .setDescription('Country management microservice')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('shared-db-example/api-docs', app, document);

  app.getHttpAdapter().get('/shared-db-example/api-docs/json', (_req: any, res: any) => {
    res.json(document);
  });

  const port = process.env['SHARED_DB_SERVICE_PORT'] || 3005;
  await app.listen(port);
  logger.log(`Shared DB Example Service running on http://localhost:${port}/shared-db-example`);
  logger.log(`Swagger UI: http://localhost:${port}/shared-db-example/api-docs`);
}

bootstrap();
