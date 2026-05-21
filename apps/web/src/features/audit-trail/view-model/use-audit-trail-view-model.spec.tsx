import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameReplayRecord } from '../../../lib/api';
import {
  useAuditTrailViewModel,
  type AuditTrailViewModel,
  type UseAuditTrailViewModelInput,
} from './use-audit-trail-view-model';

function buildReplay(eventCount = 2): GameReplayRecord {
  return {
    gameSession: {
      id: 'session-1',
      name: 'Replay Session',
      status: 'active',
      currentRound: 2,
    },
    rounds: [],
    events: Array.from({ length: eventCount }, (_, index) => ({
      id: `event-${index + 1}`,
      type: index === 0 ? ('message' as const) : ('action' as const),
      createdAt: `2026-04-14T10:0${index}:00.000Z`,
      roundNumber: 2,
      turnNumber: index + 1,
      senderAgentName: index === 0 ? 'Banker Bot' : undefined,
      visibility: index === 0 ? ('public' as const) : undefined,
      agentName: index === 0 ? undefined : 'Trader Bot',
      actionType: index === 0 ? undefined : ('finalize_turn' as const),
      content: index === 0 ? 'Message content' : undefined,
    })),
  };
}

function renderHook(props: UseAuditTrailViewModelInput): {
  getViewModel: () => AuditTrailViewModel;
  rerender: (nextProps: UseAuditTrailViewModelInput) => void;
  unmount: () => void;
} {
  const container = document.createElement('div');
  let root: Root | undefined;
  let viewModel: AuditTrailViewModel | undefined;

  function Harness(harnessProps: UseAuditTrailViewModelInput): ReactNode {
    viewModel = useAuditTrailViewModel(harnessProps);
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<Harness {...props} />);
  });

  return {
    getViewModel: () => {
      if (!viewModel) {
        throw new Error('View model was not rendered.');
      }

      return viewModel;
    },
    rerender: (nextProps) => {
      act(() => {
        root?.render(<Harness {...nextProps} />);
      });
    },
    unmount: () => {
      act(() => {
        root?.unmount();
      });
    },
  };
}

describe('useAuditTrailViewModel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns default filter/window options and visible event counts', () => {
    const hook = renderHook({ replay: buildReplay(), selectedRound: 2 });
    const viewModel = hook.getViewModel();

    expect(viewModel.activeFilter).toBe('all');
    expect(viewModel.activeWindow).toBe('all');
    expect(viewModel.activeRoundWindow).toBe('all');
    expect(viewModel.visibleEventCount).toBe(2);
    expect(viewModel.mergedEventCount).toBe(2);
    expect(viewModel.hasReplayActivity).toBe(true);
    expect(viewModel.filterOptions.map((option) => option.label)).toEqual([
      'all',
      'treasury',
      'market',
      'messages',
      'actions',
      'transfers',
    ]);

    hook.unmount();
  });

  it('updates filter, event window, round window, and expanded state through commands', () => {
    const hook = renderHook({ replay: buildReplay(4), selectedRound: 2 });

    act(() => {
      hook.getViewModel().setActiveFilter('messages');
      hook.getViewModel().setActiveWindow('5');
      hook.getViewModel().setActiveRoundWindow('1');
      hook.getViewModel().toggleExpanded();
    });

    expect(hook.getViewModel()).toMatchObject({
      activeFilter: 'messages',
      activeWindow: '5',
      activeRoundWindow: '1',
      isExpanded: false,
      visibleEventCount: 1,
    });

    hook.unmount();
  });

  it('tracks animation ids for newly visible events and clears them after the timeout', async () => {
    const hook = renderHook({ replay: buildReplay(1), selectedRound: 2 });

    expect(hook.getViewModel().animatedEventIds).toEqual(['message-event-1']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(hook.getViewModel().animatedEventIds).toEqual([]);

    hook.rerender({ replay: buildReplay(2), selectedRound: 2 });
    expect(hook.getViewModel().animatedEventIds).toEqual(['event-2']);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(hook.getViewModel().animatedEventIds).toEqual([]);

    hook.unmount();
  });

  it('resets extracted audit UI state when the workspace is inactive', () => {
    const hook = renderHook({ replay: buildReplay(4), selectedRound: 2 });

    act(() => {
      hook.getViewModel().setActiveFilter('messages');
      hook.getViewModel().setActiveWindow('5');
      hook.getViewModel().setActiveRoundWindow('1');
      hook.getViewModel().toggleExpanded();
    });

    hook.rerender({
      isActive: false,
      replay: buildReplay(4),
      selectedRound: 2,
    });

    expect(hook.getViewModel()).toMatchObject({
      activeFilter: 'all',
      activeWindow: 'all',
      activeRoundWindow: 'all',
      isExpanded: true,
      animatedEventIds: [],
    });

    hook.unmount();
  });
});
