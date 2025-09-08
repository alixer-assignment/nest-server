import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { setupSwagger } from './common/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware - Helmet for security headers
  app.use(helmet());

  // CORS configuration - origins from env CORS_ORIGINS
  app.enableCors({
    origin: configService.get('app.corsOrigins'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe with whitelist, forbidNonWhitelisted, transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter for standard error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global prefix /api
  app.setGlobalPrefix('api');

  // Setup Swagger documentation
  setupSwagger(app);

  const port = configService.get('app.port');
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
