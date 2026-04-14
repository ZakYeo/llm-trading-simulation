import { expect, test, type Page } from '@playwright/test';

import {
  buildCustodyAccrualTransition,
  buildMarketSettlementTransition,
  buildOpenMarketPositionTransition,
} from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';
import { connectToSession, topbarMetric } from './helpers/ui';

function latestActivityMetric(page: Page) {
  return topbarMetric(page, 'Latest activity');
}

test('updates balances, exposure, and replay after a trader opens a market position', async ({
  page,
}) => {
  const scenario = buildOpenMarketPositionTransition();

  await mockSessionApiScenario(page, {
    initial: scenario.initial,
    orchestrate: {
      type: 'success',
      config: {
        nextState: scenario.nextState,
        response: scenario.orchestratedRound,
      },
    },
  });
  await connectToSession(page, scenario.initial.session.id);

  await page.getByRole('button', { name: '1 turn' }).click();
  await page.getByRole('button', { name: /Run next 1 turn/ }).click();

  await expect(latestActivityMetric(page)).toContainText(
    `Ran 1 turn for session ${scenario.initial.session.id}`,
  );
  await expect(page.locator('.market-shell')).toContainText(
    '2 opportunities / 1 position',
  );
  await expect(page.locator('.market-shell')).toContainText('Trader exposure');
  await expect(page.locator('.market-shell')).toContainText('20.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('80.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('20.00');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot / open market position',
  );
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot opened Binary Event Volatility',
  );
});

test('updates treasury totals, replay, and round metrics after interest accrues', async ({
  page,
}) => {
  const scenario = buildCustodyAccrualTransition();

  await mockSessionApiScenario(page, {
    initial: scenario.initial,
    advanceRound: {
      type: 'success',
      config: {
        nextState: scenario.nextState,
      },
    },
  });
  await connectToSession(page, scenario.initial.session.id);

  await page.getByRole('button', { name: 'Advance round settlement' }).click();

  await expect(topbarMetric(page, 'Round')).toContainText('2');
  await expect(latestActivityMetric(page)).toContainText(
    'Advanced to round 2 with 250 bps custody interest',
  );
  await expect(page.locator('.treasury-shell')).toContainText('10.25');
  await expect(page.locator('.treasury-shell')).toContainText('0.25');
  await expect(page.locator('.balance-card').first()).toContainText('110.25');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot accrued custody interest',
  );
});

test('updates market settlement status and replay after the round advances', async ({
  page,
}) => {
  const scenario = buildMarketSettlementTransition();

  await mockSessionApiScenario(page, {
    initial: scenario.initial,
    advanceRound: {
      type: 'success',
      config: {
        nextState: scenario.nextState,
      },
    },
  });
  await connectToSession(page, scenario.initial.session.id);

  await page.getByRole('button', { name: 'Advance round settlement' }).click();

  await expect(topbarMetric(page, 'Round')).toContainText('2');
  await expect(page.locator('.market-shell')).toContainText('Settled');
  await expect(page.locator('.market-shell')).toContainText('Round 2');
  await expect(page.locator('.balance-card').nth(1)).toContainText('123.00');
  await expect(page.locator('.balance-card').nth(1)).toContainText('0.00');
  await expect(page.locator('.replay-panel')).toContainText(
    'Trader Bot settled Binary Event Volatility',
  );
  await expect(page.locator('.replay-panel')).toContainText('PnL 3.00');
});
