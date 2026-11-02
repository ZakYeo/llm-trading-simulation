import { expect, test } from '@playwright/test';
import {
  advanceRound,
  createBankerTraderSession,
  placeFundsWithBanker,
} from './helpers/session-api';
import { connectToSession, topbarMetric } from './helpers/ui';

test('@smoke connects to persisted custody and financial state', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Seeded Session',
  );
  await placeFundsWithBanker(request, session, '10.0000');
  await advanceRound(request, session.id, 250);
  await connectToSession(page, session.id);
  await expect(topbarMetric(page, 'Session')).toContainText(session.name);
  await expect(topbarMetric(page, 'Round')).toContainText('2');
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  await expect(page.locator('.balance-card').first()).toContainText('110.25');
  await expect(page.locator('.balance-card').nth(1)).toContainText('90.00');
  await expect(page.locator('.treasury-shell')).toContainText('10.25');
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.locator('.replay-panel')).toContainText(
    /custody placement/i,
  );
  await expect(page.locator('.replay-panel')).toContainText(/custody accrual/i);
});

test('@smoke connects, changes views and opens help', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Startup Session',
  );
  await page.goto('/');
  await expect(page.getByLabel('Connect to session')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await page.getByLabel('Connect to session').selectOption(session.id);
  await expect(
    page.getByRole('link', { name: 'Conversation', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Session menu' }).click();
  await expect(
    page.getByRole('button', { name: 'Change session' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText(/custody/i);
});

test('@smoke runs a turn and preserves results across views', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Turn Session',
  );
  await connectToSession(page, session.id);
  await page.getByRole('button', { name: '1 turn', exact: true }).click();
  await page
    .getByRole('button', { name: 'Run next 1 turn', exact: true })
    .click();
  await expect(topbarMetric(page, 'Latest activity')).toContainText(
    `Ran 1 turn for session ${session.id}`,
  );
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  await expect(page.locator('.market-shell')).toContainText('1 position');
  await expect(page.locator('.balance-card').nth(1)).not.toContainText(
    'Available100.00',
  );
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.locator('.replay-panel')).toContainText(
    /market position opened/i,
  );
});

test('@smoke displays pending feedback across view changes', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Pending Session',
  );
  await connectToSession(page, session.id);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/agents/sessions/${session.id}/rounds/orchestrate`,
    async (route) => {
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    },
  );
  await page.getByRole('button', { name: '1 turn', exact: true }).click();
  await page
    .getByRole('button', { name: 'Run next 1 turn', exact: true })
    .click();
  await expect(
    page.getByRole('status', { name: 'Latest activity' }),
  ).toContainText('Running 1 turn');
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(
    page.getByRole('status', { name: 'Latest activity' }),
  ).toContainText('Running 1 turn');
  release();
  await expect(topbarMetric(page, 'Latest activity')).toContainText(
    `Ran 1 turn for session ${session.id}`,
  );
});

test('@smoke advances a round and renders persisted interest', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Round Session',
  );
  await placeFundsWithBanker(request, session, '10.0000');
  await connectToSession(page, session.id);
  await page
    .getByRole('button', { name: 'Advance round settlement', exact: true })
    .click();
  await expect(topbarMetric(page, 'Round')).toContainText('2');
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  await expect(page.locator('.treasury-shell')).toContainText('10.25');
  await expect(page.locator('.treasury-shell')).toContainText('0.25');
  await expect(page.locator('.balance-card').first()).toContainText('110.25');
});

test('@smoke preserves state when orchestration fails', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Failure Session',
  );
  await connectToSession(page, session.id);
  await page.route(
    `**/agents/sessions/${session.id}/rounds/orchestrate`,
    (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Synthetic orchestrate failure.' }),
      }),
  );
  await page.getByRole('button', { name: '1 turn', exact: true }).click();
  await page
    .getByRole('button', { name: 'Run next 1 turn', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Synthetic orchestrate failure.',
  );
  await expect(topbarMetric(page, 'Round')).toContainText('1');
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  await expect(page.locator('.balance-card').first()).toContainText('100.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('100.00');
  await expect(page.locator('.market-shell')).toContainText('0 positions');
});

test('@smoke generates and reloads the recorded round summary', async ({
  page,
  request,
}) => {
  const session = await createBankerTraderSession(
    request,
    'Playwright Round Summary',
  );
  await connectToSession(page, session.id);
  const card = page.getByRole('region', { name: 'AI summary this round' });
  await expect(card).toContainText('Run turns to generate');
  await page.getByRole('button', { name: '1 turn', exact: true }).click();
  await page
    .getByRole('button', { name: 'Run next 1 turn', exact: true })
    .click();
  await expect(card).toContainText('Mock runtime');
  await expect(card.locator('.round-summary-text')).toContainText(
    'Round 1 recorded',
  );
  const text = await card.locator('.round-summary-text').textContent();
  await page.reload();
  await expect(card.locator('.round-summary-text')).toHaveText(text!);
  await page
    .getByRole('button', { name: 'Advance round settlement', exact: true })
    .click();
  await expect(card).toContainText('Round 2');
  await expect(card).toContainText('Run turns to generate');
});
