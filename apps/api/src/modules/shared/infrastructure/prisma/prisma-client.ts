import { PrismaPg } from '@prisma/adapter-pg';

import {
  Prisma,
  PrismaClient,
} from '../../../../generated/prisma-client-runtime-v2/client.js';

export { Prisma, PrismaClient };

export function createPgAdapter(connectionString: string) {
  return new PrismaPg({
    connectionString,
  });
}

export function createPrismaClient(
  connectionString = process.env.DATABASE_URL,
) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create PrismaClient');
  }

  return new PrismaClient({
    adapter: createPgAdapter(connectionString),
  });
}
