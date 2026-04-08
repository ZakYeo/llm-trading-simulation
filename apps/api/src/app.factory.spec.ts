import type { INestApplication } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { configureApp } from './app.factory.js';

describe('configureApp', () => {
  it('enables CORS for browser clients', () => {
    const app = {
      setGlobalPrefix: vi.fn(),
      useGlobalFilters: vi.fn(),
      enableCors: vi.fn(),
    } as unknown as INestApplication;

    configureApp(app);

    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      }),
    );
  });
});
