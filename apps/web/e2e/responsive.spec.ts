import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  buildCustodyPlacedState,
  buildOpenMarketPositionTransition,
} from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

const sizes = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1080 },
];

function populatedState() {
  const initial = buildCustodyPlacedState();
  initial.session.name =
    'A long-running negotiation about liquidity, custody, and event risk';
  initial.session.agents[0].availableBalance = '123456789012.1234';
  initial.session.marketPositions =
    buildOpenMarketPositionTransition().nextState.session.marketPositions;
  for (let i = 0; i < 3; i++)
    initial.session.agents.push({
      ...initial.session.agents[1],
      id: `extra-${i}`,
      name: `Additional trader ${i + 1} with a longer display name`,
    });
  initial.replay.events.push({
    id: 'responsive-message',
    type: 'message',
    roundNumber: 1,
    turnNumber: 1,
    createdAt: '2026-04-14T10:00:00.000Z',
    senderAgentName: 'Trader Bot',
    recipientAgentName: 'Banker Bot',
    visibility: 'private',
    content:
      'I would like to compare the custody terms before taking a position. ' +
      'A detailed negotiation continues. '.repeat(20) +
      'reference-' +
      'x'.repeat(150),
  });
  return initial;
}

async function fits(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
    ),
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const clipped = await page
    .locator('button,input,select')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < -1 ||
              rect.right > document.documentElement.clientWidth + 1)
          );
        })
        .map(
          (element) =>
            element.getAttribute('aria-label') ?? element.textContent,
        ),
    );
  expect(clipped).toEqual([]);
}

for (const theme of ['light', 'dark'])
  for (const size of sizes) {
    test(`${theme} theme works at ${size.width}×${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const initial = populatedState();
      await mockSessionApiScenario(page, { initial });
      await page.goto('/');
      await page
        .getByRole('button', { name: 'Appearance', exact: true })
        .click();
      await page.getByLabel('Color theme').selectOption(theme);
      await page.keyboard.press('Escape');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await fits(page);
      await mkdir('tmp/ui-redesign', { recursive: true });
      if (size.width === 390 || size.width === 1366)
        await page.screenshot({
          path: `tmp/ui-redesign/${theme}-${size.width}-setup.png`,
          fullPage: true,
        });
      await page
        .getByLabel('Connect to session')
        .selectOption(initial.session.id);
      await expect(
        page.getByRole('complementary', { name: 'Financial context' }),
      ).toContainText('123,456,789,012.1234');
      await fits(page);
      await page.screenshot({
        path: `tmp/ui-redesign/${theme}-${size.width}-simulation.png`,
        fullPage: true,
      });
      for (const tab of ['Finances', 'History']) {
        await page.getByRole('link', { name: tab, exact: true }).click();
        await fits(page);
        if (size.width === 390 || size.width === 1366)
          await page.screenshot({
            path: `tmp/ui-redesign/${theme}-${size.width}-${tab.toLowerCase()}.png`,
            fullPage: true,
          });
      }
      await page.getByRole('link', { name: 'Finances', exact: true }).click();
      const trigger = page.getByRole('button', {
        name: 'Inspect opportunity Carry Ladder',
        exact: true,
      });
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await fits(page);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /Close/ })
        .click();
      await expect(trigger).toBeFocused();
      await page.getByRole('button', { name: 'Help', exact: true }).click();
      await fits(page);
      await page.keyboard.press('Escape');
      expect(errors).toEqual([]);
    });
  }

test('adapts to resizing, reduced motion and 200 percent zoom without losing state', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  const initial = populatedState();
  await mockSessionApiScenario(page, { initial });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Connect to session').selectOption(initial.session.id);
  await page.getByRole('link', { name: 'Finances', exact: true }).click();
  for (const size of sizes) {
    await page.setViewportSize(size);
    await fits(page);
    await expect(
      page.getByRole('link', { name: 'Finances', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await fits(page);
  await page
    .getByRole('button', {
      name: 'Inspect opportunity Carry Ladder',
      exact: true,
    })
    .click();
  await fits(page);
  await page.keyboard.press('Escape');
});
