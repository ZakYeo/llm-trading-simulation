import { expect, test } from '@playwright/test';
import { buildStaticMarketState } from './helpers/fixtures';
import { mockSessionApiScenario } from './helpers/mock-api';

test('conversation is bounded and does not pull readers away from earlier activity', async ({
  page,
}) => {
  const initial = buildStaticMarketState();
  initial.replay.events = Array.from({ length: 30 }, (_, i) => ({
    id: `message-${i}`,
    type: 'message',
    roundNumber: 1,
    turnNumber: i + 1,
    createdAt: new Date(Date.UTC(2026, 3, 14, 10, i)).toISOString(),
    senderAgentName: 'Trader Bot',
    visibility: 'public',
    content: `Recorded message ${i}. ` + 'Some details. '.repeat(10),
  }));
  const next = structuredClone(initial);
  next.replay.events.push({
    ...initial.replay.events[0],
    id: 'new-message',
    createdAt: '2026-04-14T11:00:00.000Z',
    content: 'Newly recorded activity.',
  });
  await mockSessionApiScenario(page, {
    initial,
    orchestrate: { type: 'success', config: { nextState: next } },
  });
  await page.goto(`/#/sessions/${initial.session.id}/conversation`);
  const feed = page.getByRole('region', { name: 'Conversation activity' });
  await expect(feed).toBeVisible();
  const size = await feed.evaluate((e) => ({
    height: e.clientHeight,
    scroll: e.scrollHeight,
  }));
  expect(size.height).toBeLessThan(710);
  expect(size.scroll).toBeGreaterThan(size.height);
  await feed.evaluate((e) => {
    e.scrollTop = 0;
    e.dispatchEvent(new Event('scroll'));
  });
  await page.getByRole('button', { name: 'Run next 2 turns' }).click();
  await expect(
    feed.getByText('Newly recorded activity.', { exact: true }),
  ).toBeAttached();
  expect(await feed.evaluate((e) => e.scrollTop)).toBeLessThan(5);
  await page.getByRole('button', { name: 'Jump to latest activity ↓' }).click();
  await expect
    .poll(() =>
      feed.evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight),
    )
    .toBeLessThan(5);
});
