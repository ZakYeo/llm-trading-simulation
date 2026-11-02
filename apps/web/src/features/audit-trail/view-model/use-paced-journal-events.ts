import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}
function prefersReducedMotion() {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
}

/** Pace appended events; loading saved history and changing scope are immediate. */
export function usePacedJournalEvents(
  ids: string[],
  scope: string,
  isLoading: boolean,
): string[] {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    () => false,
  );
  const [released, setReleased] = useState({ scope, ids: new Set(ids) });
  const current = useRef({
    scope,
    initialized: !isLoading,
    known: new Set(ids),
    queue: [] as string[],
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const state = current.current;
    function clearTimer() {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    }
    if (
      state.scope !== scope ||
      (!state.initialized && !isLoading) ||
      reducedMotion
    ) {
      clearTimer();
      current.current = {
        scope,
        initialized: !isLoading,
        known: new Set(ids),
        queue: [],
      };
      setReleased({ scope, ids: new Set(ids) });
      return;
    }
    if (isLoading) return;
    for (const id of ids)
      if (!state.known.has(id)) {
        state.known.add(id);
        state.queue.push(id);
      }
    function releaseNext() {
      timer.current = null;
      const id = state.queue.shift();
      if (id !== undefined)
        setReleased((previous) => ({
          scope,
          ids: new Set([...previous.ids, id]),
        }));
      if (state.queue.length) timer.current = setTimeout(releaseNext, 180);
    }
    if (state.queue.length && timer.current === null)
      timer.current = setTimeout(releaseNext, 180);
  }, [ids, scope, isLoading, reducedMotion]);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  return released.scope === scope
    ? ids.filter((id) => released.ids.has(id))
    : ids;
}
