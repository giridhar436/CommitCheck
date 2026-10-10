import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Matches the frontend's VITE_API_URL (http://localhost:3000/api).
  app.setGlobalPrefix('api');

  // Allow the Vite dev-server origin; tighten with an explicit origin
  // allowlist before deploying to production.
  app.enableCors({ origin: true, credentials: true });

  // Reject unknown/extra properties, coerce query primitives, so DTOs are
  // always clean, typed objects when they reach services.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Consistent { success, message, error } error envelope.
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`CommitCheck API listening on http://localhost:${port}/api`);
}

void bootstrap();
