import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('replaces the round note with a persisted summary after a run', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, {
    initial,
    orchestrate: { type: 'success', config: { delayMs: 300 } },
  });
  let completed = false;
  page.on('response', (response) => {
    if (response.url().endsWith('/rounds/orchestrate') && response.ok())
      completed = true;
  });
  await page.route('**/agents/sessions/*/rounds/*/summary', (route) =>
    route.fulfill({
      json: {
        summary: completed
          ? {
              gameSessionId: initial.session.id,
              roundNumber: 1,
              status: 'ready',
              provider: 'openai',
              text: 'Banker and Trader discussed custody and the listed opportunities. No settlement was recorded.',
              generatedAt: '2026-11-02T23:00:00Z',
              eventCount: initial.replay.events.length,
              includedEventCount: initial.replay.events.length,
            }
          : null,
      },
    }),
  );
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  const summary = page.getByRole('region', { name: 'AI summary this round' });
  await expect(summary).toContainText('Run turns to generate');
  await expect(
    page.getByText('A note on the round', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Run next 2 turns' }).click();
  await expect(
    summary.getByRole('status', { name: 'Waiting for round summary' }),
  ).toBeVisible();
  await expect(summary).toContainText('Banker and Trader discussed custody');
  await page.reload();
  await expect(summary).toContainText('Banker and Trader discussed custody');
});

test('summary generation failure does not turn a successful run into an error', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await page.route('**/agents/sessions/*/rounds/*/summary', (route) =>
    route.fulfill({
      json: {
        summary: {
          gameSessionId: initial.session.id,
          roundNumber: 1,
          status: 'unavailable',
          provider: 'openai',
          text: null,
          generatedAt: '2026-11-02T23:00:00Z',
          eventCount: 0,
          includedEventCount: 0,
        },
      },
    }),
  );
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  await page.getByRole('button', { name: 'Run next 2 turns' }).click();
  await expect(
    page.getByRole('region', { name: 'AI summary this round' }),
  ).toContainText('Summary unavailable');
  await expect(
    page.getByRole('button', { name: 'Run next 2 turns' }),
  ).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
