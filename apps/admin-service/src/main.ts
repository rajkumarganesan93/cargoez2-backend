import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AdminServiceModule } from './admin-service.module';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AdminServiceModule);

  app.setGlobalPrefix('admin-service');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173',
      'http://localhost:5177',
      'http://localhost:5178',
    ],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Admin Service')
    .setDescription('Central administration service for CargoEz multi-tenant platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('admin-service/api-docs', app, document);

  const port = process.env.ADMIN_SERVICE_PORT || 3001;
  await app.listen(port);
  console.log(`Admin Service running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/admin-service/api-docs`);
}
bootstrap();
