import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Phase 14 — documents may submit base64 PDF/DOCX bytes for extraction
  // (10 MB decoded ≈ 13.7 MB base64). The JSON parser limit must exceed
  // that envelope; DTO-level validation still caps every field.
  app.useBodyParser('json', { limit: '15mb' });

  // Matches the frontend's VITE_API_URL (http://localhost:3000/api).
  app.setGlobalPrefix('api');

  // Allow the Vite dev-server origin; tighten with an explicit origin
  // allowlist before deploying to production.
  app.enableCors({ origin: true, credentials: true });

  // Reject unknown/extra properties and coerce query primitives via explicit
  // @Type(() => Number) in DTOs — no implicit conversion, so wrong JSON types
  // (e.g. a number where a string is expected) fail validation instead of
  // being silently coerced.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Consistent { success, message, error } error envelope.
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`CommitCheck API listening on http://localhost:${port}/api`);
}

void bootstrap();
