import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  AuthConfigError,
  assertAuthConfigured,
  getSupabaseJwks,
  getSupabaseJwtSecret,
} from './auth/jwt.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // Fail fast — authentication cannot be silently disabled. Refuse to start
  // when no token verifier can be configured (JWKS via SUPABASE_URL and/or
  // the legacy HS256 secret) rather than serving unprotected routes.
  try {
    assertAuthConfigured();
  } catch (error) {
    const reason =
      error instanceof AuthConfigError ? error.message : 'unknown configuration error';
    logger.error(`Startup aborted. ${reason}`);
    process.exit(1);
  }

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

  // Startup configuration summary — feature flags and endpoints only, never
  // secret values (spec: secrets must not reach logs).
  logger.log(`CommitCheck API listening on http://localhost:${port}/api`);
  const authModes = [
    getSupabaseJwks() ? 'JWKS (asymmetric tokens)' : null,
    getSupabaseJwtSecret() ? 'HS256 secret (legacy tokens)' : null,
  ].filter(Boolean);
  logger.log(
    `Auth: Supabase Auth (${authModes.join(' + ')}) — all routes require a Bearer token`,
  );
  logger.log(
    `Embeddings: ${process.env.EMBEDDING_PROVIDER?.trim() || 'disabled'} · Notifications: ${
      process.env.RESEND_API_KEY?.trim() ? 'email (Resend)' : 'log (dev default)'
    }`,
  );
}

void bootstrap();
