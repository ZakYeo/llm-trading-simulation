import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { HttpErrorFilter } from './modules/shared/presentation/filters/http-error.filter.js';

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpErrorFilter());

  return app;
}

export async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  return configureApp(app);
}
