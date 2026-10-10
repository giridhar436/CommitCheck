import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Matches the frontend's VITE_API_URL (http://localhost:3000/api).
  app.setGlobalPrefix('api');

  // Allow the Vite dev-server origin; tighten with an explicit origin
  // allowlist before deploying to production.
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`CommitCheck API listening on http://localhost:${port}/api`);
}

void bootstrap();
