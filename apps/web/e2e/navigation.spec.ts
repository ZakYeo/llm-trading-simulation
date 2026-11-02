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

test('browser Back closes an inspector from the session being left', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  const second = structuredClone(initial);
  second.session.id = 'second-session';
  second.session.name = 'Second session';
  second.session.agents[0].availableBalance = '999.0000';
  second.replay.gameSession.id = second.session.id;
  await mockSessionApiScenario(page, { initial });
  await page.route('**/api/game/sessions', (route) =>
    route.fulfill({
      json: [initial.session, second.session].map((session) => ({
        id: session.id,
        name: session.name,
        status: session.status,
        currentRound: session.currentRound,
      })),
    }),
  );
  await page.route(`**/api/game/sessions/${second.session.id}`, (route) =>
    route.fulfill({ json: second.session }),
  );
  await page.route(`**/api/replay/sessions/${second.session.id}`, (route) =>
    route.fulfill({ json: second.replay }),
  );
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  await page.getByRole('button', { name: 'Session menu' }).click();
  await page.getByLabel('Connect to session').selectOption(second.session.id);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Session menu' }),
  ).toContainText('Second session');
  await page.getByRole('button', { name: 'Banker Bot banker ↗' }).click();
  await expect(page.getByRole('dialog')).toContainText('999.00');
  await page.goBack();
  await expect(page).toHaveURL(
    new RegExp(initial.session.id + '/conversation$'),
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
