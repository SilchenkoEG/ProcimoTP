import type { INestApplication } from '@nestjs/common';

/** HTTP-level setup shared by main.ts and the integration tests, so both behave the same. */
export function configureApp(app: INestApplication): INestApplication {
  // Every route lives under /api, so nginx can forward /api/* unchanged.
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
