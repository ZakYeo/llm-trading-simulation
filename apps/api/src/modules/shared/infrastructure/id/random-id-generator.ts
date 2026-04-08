import { randomUUID } from 'node:crypto';

import type { IdGeneratorPort } from '../../application/ports/id-generator.port.js';

export class RandomIdGenerator implements IdGeneratorPort {
  next(): string {
    return randomUUID();
  }
}
