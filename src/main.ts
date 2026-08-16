import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global API prefix – e.g., /api/products, /api/sales
  app.setGlobalPrefix('api');

  // Enable CORS for frontend access
  app.enableCors();

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('OGANCORE API')
    .setDescription('Multi-tenant Business Management + POS SaaS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // UI at /api/docs

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();