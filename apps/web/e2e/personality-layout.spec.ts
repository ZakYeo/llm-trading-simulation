import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('expanding a personality keeps adjacent controls compact and animates both directions', async ({
  page,
}) => {
  await mockSessionApiScenario(page, { initial: buildStaticMarketState() });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/');
  const banker = page.getByLabel('Banker Bot name');
  const before = await banker.boundingBox();
  const toggle = page.getByText('Customize Trader Bot personality', {
    exact: true,
  });
  await toggle.click();
  await expect(
    page.getByRole('slider', { name: /Assertiveness/ }),
  ).toBeVisible();
  await expect
    .poll(async () => Math.round((await banker.boundingBox())!.height))
    .toBe(Math.round(before!.height));
  const trader = page.getByLabel('Trader Bot name');
  expect(
    Math.abs((await banker.boundingBox())!.y - (await trader.boundingBox())!.y),
  ).toBeLessThan(2);
  await toggle.click();
  await expect(
    page.getByRole('slider', { name: /Assertiveness/ }),
  ).not.toBeVisible();
});
