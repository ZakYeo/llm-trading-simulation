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
    expect(html).toContain('Session Startup');
    expect(html).toContain(
      'Initialize simulation parameters and assemble agent roster.',
    );
    expect(html).toContain('Global Parameters');
    expect(html).toContain('Connect to session');
    expect(html).toContain('Agent Roster');
    expect(html).toContain('Add agent');
    expect(html).toContain('Banker Bot');
    expect(html).toContain('Trader Bot');
    expect(html).toContain('Sales aggression');
    expect(html).toContain('Risk appetite');
    expect(html).not.toContain('Operator Console');
    expect(html).not.toContain('Edit');
    expect(html).not.toContain('Audit Trail');
    expect(html).not.toContain('Market Visibility');
    expect(html).not.toContain('Run The Session');
    expect(html).not.toContain('Advance round settlement');
    expect(html).not.toContain('Latest activity');
    expect(html).not.toContain('Analyst Bot');
    expect(html).not.toContain('Lawyer Bot');
    expect(html).not.toContain('Influencer Bot');
  });
});
