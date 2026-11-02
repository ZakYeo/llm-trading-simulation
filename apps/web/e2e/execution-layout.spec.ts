import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('separates turn execution from settlement across sections', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  await expect(
    page.getByRole('heading', { name: 'Run turns', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Advance round', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Treasury interest per round (bps)'),
  ).toHaveValue('250');
  await page.getByRole('button', { name: '4 turns', exact: true }).click();
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Run next 4 turns', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const disclosure = page.getByText('Run turns & settlement', { exact: true });
  await disclosure.click();
  await expect(
    page.getByRole('button', { name: 'Run next 4 turns', exact: true }),
  ).not.toBeVisible();
  await disclosure.click();
  await expect(
    page.getByRole('button', { name: 'Run next 4 turns', exact: true }),
  ).toBeVisible();
});
