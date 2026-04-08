import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.spec.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    passWithNoTests: true,
  },
});
