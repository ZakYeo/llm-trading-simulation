import { DomainInvariantError } from './domain-invariant.error.js';
export class StaleSessionError extends DomainInvariantError {
  constructor() {
    super(
      'The session changed while this decision was being prepared. Reload and try again.',
    );
  }
}
