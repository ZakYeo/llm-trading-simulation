import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('Thought precedes a trader message and quote terms survive navigation', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  const common = {
    createdAt: '2026-11-03T22:00:00.000Z',
    roundNumber: initial.session.currentRound,
    turnNumber: 1,
  };
  initial.replay.events = [
    {
      ...common,
      id: 'action-1',
      type: 'action',
      agentId: 'trader-1',
      agentName: 'Trader Bot',
      actionType: 'send_private_message',
      recipientAgentId: 'banker-1',
      content: 'What would I earn on a 20 SIM deposit?',
      depositTerms: { requestAmount: '20.0000' },
    },
    {
      ...common,
      id: 'thought-action-1',
      type: 'thought',
      agentId: 'trader-1',
      agentName: 'Trader Bot',
      content:
        'My high conviction threshold makes comparing a deposit offer worthwhile.',
      personalitySnapshot: {
        kind: 'trader',
        assertiveness: 7,
        riskAppetite: 3,
        convictionThreshold: 8,
      },
    },
    {
      ...common,
      createdAt: '2026-11-03T22:00:00.001Z',
      id: 'message-1',
      type: 'message',
      senderAgentId: 'trader-1',
      recipientAgentId: 'banker-1',
      senderAgentName: 'Trader Bot',
      recipientAgentName: 'Banker Bot',
      visibility: 'private',
      content: 'What would I earn on a 20 SIM deposit?',
    },
    {
      ...common,
      createdAt: '2026-11-03T22:00:01.000Z',
      id: 'quote-1',
      type: 'action',
      agentName: 'Banker Bot',
      actionType: 'send_private_message',
      depositTerms: {
        requestId: 'request',
        offerAmount: '20.0000',
        rateBps: 150,
        expectedInterest: '0.3000',
      },
    },
  ];
  await mockSessionApiScenario(page, { initial });
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  const feed = page.getByRole('region', { name: 'Conversation activity' });
  await expect(feed.locator('.journal-thought')).toContainText(
    'Conviction threshold 8/10',
  );
  await expect(
    feed.locator('.deposit-quote').filter({ hasText: 'Deposit offer' }),
  ).toContainText('0.3000 SIM');
  await expect(feed.getByText('Trader Bot / send_private_message')).toHaveCount(
    0,
  );
  await expect(
    feed.locator('.journal-message').filter({ hasText: 'What would I earn' }),
  ).toContainText('20.0000 SIM');
  const thought = feed.locator('.journal-thought');
  const message = feed
    .locator('.journal-message')
    .filter({ hasText: 'What would I earn' });
  expect(await thought.evaluate((node) => getComputedStyle(node).padding)).toBe(
    await message.evaluate((node) => getComputedStyle(node).padding),
  );
  expect(
    await thought.evaluate((node) =>
      parseFloat(getComputedStyle(node).paddingLeft),
    ),
  ).toBeGreaterThanOrEqual(16);
  const types = await feed
    .locator('article')
    .evaluateAll((nodes) => nodes.map((node) => node.className));
  expect(types[0]).toContain('journal-thought');
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.locator('.replay-panel')).toContainText(
    'Decision explanation',
  );
  await page.getByRole('link', { name: 'LLM Trading Simulator' }).click();
  await expect(page.getByLabel('Connect to session')).toBeVisible();
  await expect(page.getByLabel('Connect to session')).toHaveValue(
    initial.session.id,
  );
});
