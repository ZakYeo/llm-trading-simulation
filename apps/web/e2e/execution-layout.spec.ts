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

test('restores controls when a collapsed mobile disclosure becomes desktop', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  await page.getByText('Run turns & settlement', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Run next 2 turns' }),
  ).not.toBeVisible();
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(
    page.getByRole('button', { name: 'Run next 2 turns' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Advance round settlement' }),
  ).toBeVisible();
});

test('selected turn preset has readable contrast in dark mode', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByLabel('Color theme').selectOption('dark');
  const contrast = await page
    .getByRole('button', { name: '2 turns', exact: true })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      function luminance(color: string) {
        const channels = (color.match(/[\d.]+/g) ?? [])
          .slice(0, 3)
          .map((value) => {
            const channel = Number(value) / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      }
      const fg = luminance(style.color),
        bg = luminance(style.backgroundColor);
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
