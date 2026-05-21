import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import type { GameReplayRecord } from '../../../lib/api';
import {
  createAuditTrailViewData,
  replayFilters,
  type AuditTrailTimelineEvent,
  type ReplayFilter,
  type ReplayRoundWindow,
  type ReplayWindow,
  type StreamedAuditMessageRecord,
} from '../model/audit-trail';

export type { ReplayRoundWindow, ReplayWindow } from '../model/audit-trail';

export interface UseAuditTrailViewModelInput {
  isActive?: boolean;
  replay?: GameReplayRecord;
  streamedMessages?: StreamedAuditMessageRecord[];
  selectedRound?: number;
}

export interface AuditTrailOption<TValue extends string> {
  label: string;
  value: TValue;
}

export interface AuditTrailRoundGroup {
  roundNumber: number;
  events: AuditTrailTimelineEvent[];
}

export interface AuditTrailViewModel {
  activeFilter: ReplayFilter;
  activeRoundWindow: ReplayRoundWindow;
  activeWindow: ReplayWindow;
  animatedEventIds: string[];
  eventsByRound: AuditTrailRoundGroup[];
  filterOptions: Array<AuditTrailOption<ReplayFilter>>;
  hasReplayActivity: boolean;
  isExpanded: boolean;
  mergedEventCount: number;
  roundWindowOptions: Array<AuditTrailOption<ReplayRoundWindow>>;
  timelineScrollRef: RefObject<HTMLDivElement | null>;
  visibleEventCount: number;
  windowOptions: Array<AuditTrailOption<ReplayWindow>>;
  setActiveFilter: (filter: ReplayFilter) => void;
  setActiveRoundWindow: (window: ReplayRoundWindow) => void;
  setActiveWindow: (window: ReplayWindow) => void;
  toggleExpanded: () => void;
}

const windowOptions: Array<AuditTrailOption<ReplayWindow>> = [
  { label: 'Last 5', value: '5' },
  { label: 'Last 10', value: '10' },
  { label: 'Last 20', value: '20' },
  { label: 'All', value: 'all' },
];

const roundWindowOptions: Array<AuditTrailOption<ReplayRoundWindow>> = [
  { label: 'Last 1 round', value: '1' },
  { label: 'Last 3 rounds', value: '3' },
  { label: 'Last 5 rounds', value: '5' },
  { label: 'All rounds', value: 'all' },
];

const filterOptions = replayFilters.map((filter) => ({
  label: filter,
  value: filter,
}));
const emptyStreamedMessages: StreamedAuditMessageRecord[] = [];

export function useAuditTrailViewModel({
  isActive = true,
  replay,
  streamedMessages = emptyStreamedMessages,
  selectedRound,
}: UseAuditTrailViewModelInput): AuditTrailViewModel {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ReplayFilter>('all');
  const [activeWindow, setActiveWindow] = useState<ReplayWindow>('all');
  const [activeRoundWindow, setActiveRoundWindow] =
    useState<ReplayRoundWindow>('all');
  const [animatedEventIds, setAnimatedEventIds] = useState<string[]>([]);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const previousVisibleEventIds = useRef<string[]>([]);

  useEffect(() => {
    if (isActive) {
      return;
    }

    setIsExpanded(true);
    setActiveFilter('all');
    setActiveWindow('all');
    setActiveRoundWindow('all');
    setAnimatedEventIds([]);
    previousVisibleEventIds.current = [];
  }, [isActive]);

  const {
    eventsByRound,
    mergedEvents,
    visibleEvents,
    visibleStreamedMessages,
  } = useMemo(
    () =>
      createAuditTrailViewData({
        replay,
        streamedMessages,
        selectedRound,
        activeFilter,
        activeWindow,
        activeRoundWindow,
      }),
    [
      activeFilter,
      activeRoundWindow,
      activeWindow,
      replay,
      selectedRound,
      streamedMessages,
    ],
  );

  useEffect(() => {
    const visibleAnimationKeys = visibleEvents.map(
      (event) => event.animationId,
    );

    if (!isActive || !isExpanded) {
      previousVisibleEventIds.current = visibleAnimationKeys;
      return;
    }

    const previousIds = new Set(previousVisibleEventIds.current);
    const appendedEventIds = visibleAnimationKeys.filter(
      (eventId) => !previousIds.has(eventId),
    );

    previousVisibleEventIds.current = visibleAnimationKeys;

    if (appendedEventIds.length === 0) {
      return;
    }

    setAnimatedEventIds(appendedEventIds);
    timelineScrollRef.current?.scrollTo({
      top: timelineScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });

    const timer = window.setTimeout(() => {
      setAnimatedEventIds((current) =>
        current.filter((eventId) => !appendedEventIds.includes(eventId)),
      );
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isActive, isExpanded, visibleEvents]);

  return {
    activeFilter,
    activeRoundWindow,
    activeWindow,
    animatedEventIds,
    eventsByRound,
    filterOptions,
    hasReplayActivity: Boolean(replay) || visibleStreamedMessages.length > 0,
    isExpanded,
    mergedEventCount: mergedEvents.length,
    roundWindowOptions,
    timelineScrollRef,
    visibleEventCount: visibleEvents.length,
    windowOptions,
    setActiveFilter,
    setActiveRoundWindow,
    setActiveWindow,
    toggleExpanded: () => setIsExpanded((current) => !current),
  };
}
