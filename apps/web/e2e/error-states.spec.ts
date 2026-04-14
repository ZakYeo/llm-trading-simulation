import { expect, test } from '@playwright/test';

import {
  buildBankerTraderSession,
  buildReplayRecord,
  buildStaticMarketState,
} from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';
import { connectToSession, topbarMetric } from './helpers/ui';

test('keeps previous session state visible when orchestration fails', async ({
  page,
}) => {
  const initial = buildStaticMarketState();

  await mockSessionApiScenario(page, {
    initial,
    orchestrate: {
      type: 'failure',
      config: {
        status: 500,
        message: 'Synthetic orchestrate failure.',
      },
    },
  });
  await connectToSession(page, initial.session.id);

  await page.getByRole('button', { name: '1 turn' }).click();
  await page.getByRole('button', { name: /Run next 1 turn/ }).click();

  await expect(page.locator('.error-copy')).toContainText(
    'Synthetic orchestrate failure.',
  );
  await expect(page.locator('.market-shell')).toContainText(
    'No market positions opened yet.',
  );
  await expect(page.locator('.balance-card').first()).toContainText('100.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('100.00');
  await expect(page.locator('.activity-note strong')).toContainText(
    'No actions yet.',
  );
});

test('does not fake a round increment when round advancement fails', async ({
  page,
}) => {
  const initial = buildStaticMarketState();

  await mockSessionApiScenario(page, {
    initial,
    advanceRound: {
      type: 'failure',
      config: {
        status: 500,
        message: 'Synthetic round advancement failure.',
      },
    },
  });
  await connectToSession(page, initial.session.id);

  await page.getByRole('button', { name: 'Advance round settlement' }).click();

  await expect(page.locator('.error-copy')).toContainText(
    'Synthetic round advancement failure.',
  );
  await expect(topbarMetric(page, 'Round')).toContainText('0');
  await expect(page.locator('.activity-note strong')).toContainText(
    'No actions yet.',
  );
  await expect(page.locator('.treasury-shell')).toContainText(
    'No trader funds are currently placed with the banker.',
  );
});

test('shows the live in-progress banner while a mocked turn is still running', async ({
  page,
}) => {
  const initial = buildStaticMarketState();

  await mockSessionApiScenario(page, {
    initial,
    orchestrate: {
      type: 'success',
      config: {
        delayMs: 1_200,
      },
    },
  });
  await connectToSession(page, initial.session.id);

  await page.getByRole('button', { name: '1 turn' }).click();
  await page.getByRole('button', { name: /Run next 1 turn/ }).click();

  await expect(page.locator('.live-run-banner')).toContainText(
    'Running 1 turn...',
  );
  await expect(page.locator('.activity-note strong')).toContainText(
    `Ran 0 turns for session ${initial.session.id}`,
  );
});

test('renders stable empty-state copy for replay and market visibility', async ({
  page,
}) => {
  const session = buildBankerTraderSession({
    marketOpportunities: [],
  });

  await mockSessionApiScenario(page, {
    initial: {
      sessions: [
        {
          id: session.id,
          name: session.name,
          status: session.status,
          currentRound: session.currentRound,
        },
      ],
      session,
      replay: buildReplayRecord(session, []),
    },
  });
  await connectToSession(page, session.id);

  await expect(page.locator('.market-shell')).toContainText(
    'No live market opportunities are available in this session.',
  );
  await expect(page.locator('.market-shell')).toContainText(
    'No market positions opened yet.',
  );
  await expect(page.locator('.replay-panel')).toContainText(
    'No replay events match the current filter yet.',
  );
});
