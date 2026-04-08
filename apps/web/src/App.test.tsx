import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the operator console shell', () => {
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );

    expect(html).toContain('LLM Trading Operator Console');
    expect(html).toContain('Session Controls');
    expect(html).toContain('Event Timeline');
    expect(html).toContain('Run planner');
    expect(html).toContain('Run next 2 turns');
    expect(html).toContain('Roster');
    expect(html).toContain('Add bot');
    expect(html).toContain('Trader Bot');
  });
});
