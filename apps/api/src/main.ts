import 'reflect-metadata';

import { createApp } from './app.factory.js';

async function bootstrap() {
  const app = await createApp();
  await app.listen(
    process.env.PORT ? Number(process.env.PORT) : 3000,
    '0.0.0.0',
  );
}

void bootstrap();
