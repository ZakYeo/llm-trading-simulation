import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the operator console shell', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    );
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );

    expect(html).toContain('LLM Trading Simulator');
    expect(html).toContain('Session Setup');
    expect(html).toContain('Audit Trail');
    expect(html).toContain('Market Visibility');
    expect(html).toContain('Connect to session');
    expect(html).toContain('Run The Session');
    expect(html).toContain('Run next 2 turns');
    expect(html).toContain('Advance round settlement');
    expect(html).toContain('Add bot');
    expect(html).toContain('Banker Bot');
    expect(html).toContain('Trader Bot');
    expect(html).not.toContain(
      'Connect to a session to inspect live market opportunities and trader positions.',
    );
    expect(html).not.toContain(
      'Start by creating a session or connecting to an existing one.',
    );
    expect(html).not.toContain('Analyst Bot');
    expect(html).not.toContain('Lawyer Bot');
    expect(html).not.toContain('Influencer Bot');
  });
});
