import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';
import { connectToSession } from './helpers/ui';

test('keeps current-round journal selection independent of history filters', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  initial.session.currentRound = 2;
  initial.replay.events.push(
    {
      id: 'old-message',
      type: 'message',
      roundNumber: 1,
      createdAt: '2026-04-14T09:00:00.000Z',
      senderAgentName: 'Banker Bot',
      visibility: 'public',
      content: 'Previous round conversation.',
    },
    {
      id: 'new-message',
      type: 'message',
      roundNumber: 2,
      createdAt: '2026-04-14T10:00:00.000Z',
      senderAgentName: 'Trader Bot',
      recipientAgentName: 'Banker Bot',
      visibility: 'private',
      content: 'Current round negotiation.',
    },
  );
  await mockSessionApiScenario(page, { initial });
  await connectToSession(page, initial.session.id);
  await expect(
    page.getByText('Current round negotiation.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Previous round conversation.', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'market', exact: true }).click();
  await page.getByRole('link', { name: 'Conversation', exact: true }).click();
  await expect(
    page.getByText('Current round negotiation.', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Journal rounds').selectOption('all');
  await expect(
    page.getByText('Previous round conversation.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Inspect message', exact: true })
    .last()
    .click();
  await expect(page.getByRole('dialog')).toContainText(
    'Current round negotiation.',
  );
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Inspect message', exact: true }).last(),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Jump to latest activity ↓', exact: true })
    .click();
  await expect(page.locator('#journal-latest')).toBeFocused();
  await expect(page.locator('#journal-latest')).toBeInViewport();
});
