import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('setup excludes settlement interest and header disclosures support Escape', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await page.goto('/');
  await expect(
    page.getByLabel('Treasury interest per round (bps)'),
  ).toHaveCount(0);
  await page.getByLabel('Connect to session').selectOption(initial.session.id);
  const session = page.getByRole('button', { name: 'Session menu' });
  await session.click();
  await expect(
    page.getByText(initial.session.id, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(session).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'New session +' }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByLabel('Color theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Appearance', exact: true }),
  ).toBeFocused();
});
