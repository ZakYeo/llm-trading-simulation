import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('direct links, reload and browser history preserve the session and section', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await page.goto(`/#/sessions/${initial.session.id}/finances`);
  await expect(
    page.getByRole('heading', { name: 'Finances', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await page.goBack();
  await expect(
    page.getByRole('link', { name: 'Finances', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'History', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('button', { name: 'Run next 2 turns' }),
  ).toBeVisible();
});
