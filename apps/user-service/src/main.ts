import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { config } from 'dotenv';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, PinoLoggerService, ContextInterceptor } from '@cargoez/infrastructure';

config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new PinoLoggerService();
  app.useLogger(logger);
  app.enableCors();
  app.setGlobalPrefix('user-service');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ContextInterceptor());

  const port = process.env['USER_SERVICE_PORT'] || 3001;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('User management microservice')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'User Service (direct)')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('user-service/api-docs', app, document);

  app.getHttpAdapter().get('/user-service/api-docs/json', (_req: any, res: any) => {
    res.json(document);
  });

  await app.listen(port);
  logger.log(`User Service running on http://localhost:${port}/user-service`);
  logger.log(`Swagger UI: http://localhost:${port}/user-service/api-docs`);
}

bootstrap();
