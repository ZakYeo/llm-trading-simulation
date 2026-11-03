import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';

/** A provider failure is not a model decision and must never become a silent pass. */
export class AgentProviderError extends DomainInvariantError {
  constructor(error: unknown) {
    const details =
      error && typeof error === 'object'
        ? (error as { status?: number; code?: string; message?: string })
        : {};
    const quota =
      details.code === 'insufficient_quota' ||
      /no credits remaining|insufficient.quota|exceeded your current quota/i.test(
        details.message ?? '',
      );
    super(
      quota
        ? 'The AI provider reports no API credits remaining. Add credits to the API account, then run the turn again.'
        : details.status === 401 || details.status === 403
          ? 'The AI provider rejected the API credentials or permissions. Check the configured API key.'
          : details.status === 429
            ? 'The AI provider is rate limiting requests. Wait briefly, then run the turn again.'
            : 'The AI provider could not complete the request. Check the server logs and try again.',
    );
  }
}
