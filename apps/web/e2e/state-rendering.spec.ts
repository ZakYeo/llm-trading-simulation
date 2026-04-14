import { expect, test } from '@playwright/test';

import {
  buildCustodyPlacedState,
  buildOpenMarketPositionTransition,
  buildStaticMarketState,
} from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';
import { connectToSession, topbarMetric } from './helpers/ui';

test('renders a connected session with live opportunities and no trader exposure', async ({
  page,
}) => {
  const initial = buildStaticMarketState();

  await mockSessionApiScenario(page, {
    initial,
  });
  await connectToSession(page, initial.session.id);

  await expect(topbarMetric(page, 'Session')).toContainText(
    initial.session.name,
  );
  await expect(topbarMetric(page, 'Round')).toContainText('0');
  await expect(page.locator('.market-shell')).toContainText(
    '2 opportunities / 0 positions',
  );
  await expect(page.locator('.market-shell')).toContainText('Carry Ladder');
  await expect(page.locator('.market-shell')).toContainText(
    'Binary Event Volatility',
  );
  await expect(page.locator('.market-shell')).toContainText(
    'No market positions opened yet.',
  );
});

test('renders custody totals and balances from a controlled backend state', async ({
  page,
}) => {
  const initial = buildCustodyPlacedState();

  await mockSessionApiScenario(page, {
    initial,
  });
  await connectToSession(page, initial.session.id);

  await expect(page.locator('.treasury-shell')).toContainText(
    'Total custodied',
  );
  await expect(page.locator('.treasury-shell')).toContainText('10.00');
  await expect(page.locator('.treasury-shell')).toContainText(
    'Trader principal with banker',
  );
  await expect(
    page.getByText('No trader funds are currently placed with the banker.'),
  ).toHaveCount(0);
  await expect(page.locator('.treasury-shell')).toContainText(
    'Trader accrued interest',
  );
  await expect(page.locator('.balance-card').first()).toContainText('110.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('90.00');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot placed funds with Banker Bot',
  );
});

test('renders existing trader market exposure from a controlled backend state', async ({
  page,
}) => {
  const { nextState } = buildOpenMarketPositionTransition();

  await mockSessionApiScenario(page, {
    initial: nextState,
  });
  await connectToSession(page, nextState.session.id);

  await expect(page.locator('.market-shell')).toContainText(
    '2 opportunities / 1 position',
  );
  await expect(page.locator('.market-shell')).toContainText('Trader exposure');
  await expect(page.locator('.market-shell')).toContainText(
    'Binary Event Volatility',
  );
  await expect(page.locator('.market-shell')).toContainText('Trader Bot');
  await expect(page.locator('.market-shell')).toContainText('Open');
  await expect(page.locator('.market-shell')).toContainText('20.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('80.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('20.00');
});
