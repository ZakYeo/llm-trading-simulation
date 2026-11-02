import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('initial session loading uses skeletons and does not show empty financial state', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/api/game/sessions/${initial.session.id}`,
    async (route) => {
      await ready;
      await route.fulfill({ json: initial.session });
    },
  );
  await page.goto(`/#/sessions/${initial.session.id}/finances`);
  await expect(
    page.getByRole('status', { name: 'Loading session' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Run next 2 turns' }),
  ).toBeDisabled();
  await expect(page.getByText('No market positions opened yet.')).toHaveCount(
    0,
  );
  release();
  await expect(
    page.getByRole('status', { name: 'Loading session' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Current opportunities' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Run next 2 turns' }),
  ).toBeEnabled();
});

test('replay skeleton resolves into the empty conversation only after loading', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  initial.replay.events = [];
  await mockSessionApiScenario(page, { initial });
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/api/replay/sessions/${initial.session.id}`,
    async (route) => {
      await ready;
      await route.fulfill({ json: initial.replay });
    },
  );
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  await expect(
    page.getByRole('status', { name: 'Loading activity' }),
  ).toBeVisible();
  await expect(page.getByText('The conversation starts here.')).toHaveCount(0);
  release();
  await expect(page.getByText('The conversation starts here.')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Loading activity' }),
  ).toHaveCount(0);
});

test('saved-session skeleton animates and respects reduced motion', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  await mockSessionApiScenario(page, { initial });
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/game/sessions', async (route) => {
    await ready;
    await route.fulfill({
      json: [
        {
          id: initial.session.id,
          name: initial.session.name,
          status: initial.session.status,
          currentRound: initial.session.currentRound,
        },
      ],
    });
  });
  await page.goto('/');
  const loading = page.getByRole('status', { name: 'Loading saved sessions' });
  await expect(loading).toBeVisible();
  const animation = () =>
    loading
      .locator('.skeleton-line')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
  expect(await animation()).toBe('shimmer');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await animation()).toBe('none');
  release();
  await expect(loading).toHaveCount(0);
  await expect(page.getByLabel('Connect to session')).toBeEnabled();
});
