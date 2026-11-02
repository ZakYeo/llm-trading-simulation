import { expect, test } from '@playwright/test';
import { buildOpenMarketPositionTransition } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';
import { connectToSession } from './helpers/ui';

test('preserves full opportunity terms, account personalities and position details', async ({
  page,
}) => {
  const { nextState: initial } = buildOpenMarketPositionTransition();
  initial.session.agents[0].personalityProfile = {
    kind: 'banker',
    warmth: 5,
    salesAggression: 5,
    riskDiscipline: 5,
  };
  await mockSessionApiScenario(page, { initial });
  await connectToSession(page, initial.session.id);
  await expect(
    page.getByRole('complementary', { name: 'Financial context' }),
  ).toContainText('Binary Event Volatility');
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Inspect opportunity Binary Event Volatility',
      exact: true,
    })
    .click();
  const dialog = page.getByRole('dialog');
  for (const text of [
    'Min commitment',
    'Max commitment',
    'Expected return',
    'Return range',
    'Signal quality',
    'Holding period',
    'Listed',
    'Settlement',
  ])
    await expect(dialog).toContainText(text);
  await expect(dialog).toContainText('10.00');
  await expect(dialog).toContainText('40.00');
  await expect(dialog).toContainText('+180 bps');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', {
      name: 'Show account details for Banker Bot',
      exact: true,
    })
    .click();
  await expect(dialog).toContainText('Warmth');
  await expect(dialog).toContainText('Sales aggression');
  await expect(dialog).toContainText('Risk discipline');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', {
      name: 'Inspect position Binary Event Volatility for Trader Bot',
      exact: true,
    })
    .click();
  await expect(dialog).toContainText('20.00');
  await expect(dialog).toContainText('Round 2');
});
