import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';
import { connectToSession } from './helpers/ui';

test('keeps session and turn controls while switching views and themes', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await connectToSession(page, initial.session.id);
  await expect(
    page.getByRole('tab', { name: 'Simulation', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Turn count', { exact: true }).fill('4');
  await page.getByRole('tab', { name: 'Finances', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /current opportunities/i }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'History', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Run next 4 turns' }),
  ).toBeVisible();
  await page.getByLabel('Color theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('Color theme')).toHaveValue('dark');
});
