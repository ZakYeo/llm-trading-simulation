import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('creates a session with the same typed roster and personality payload', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/game/sessions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    body = route.request().postDataJSON();
    await route.fulfill({ json: initial.session });
  });
  await page.goto('/');
  await page
    .getByLabel('Session name', { exact: true })
    .fill('Calm experiment');
  await page
    .getByLabel('Initial balance (SIM)', { exact: true })
    .fill('125.0000');
  await page.getByRole('button', { name: 'Add agent', exact: true }).click();
  await page
    .getByRole('button', { name: 'Remove New Bot 3', exact: true })
    .click();
  await page
    .getByText('Customize Banker Bot personality', { exact: true })
    .click();
  await page.getByRole('slider', { name: /Warmth/ }).fill('8');
  await page
    .getByRole('button', { name: 'Create session', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: 'Conversation', exact: true }),
  ).toBeVisible();
  expect(body).toMatchObject({
    name: 'Calm experiment',
    initialBalance: '125.0000',
    agents: [
      {
        name: 'Banker Bot',
        role: 'banker',
        personality: { kind: 'banker', warmth: 8 },
      },
      { name: 'Trader Bot', role: 'trader' },
    ],
  });
  expect(body).not.toHaveProperty('interestRateBps');
});

test('help traps keyboard focus and restores it when dismissed', async ({
  page,
}) => {
  await mockSessionApiScenario(page, { initial: buildStaticMarketState() });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Help', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
