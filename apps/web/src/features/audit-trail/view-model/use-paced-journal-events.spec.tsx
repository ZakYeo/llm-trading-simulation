import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePacedJournalEvents } from './use-paced-journal-events';
let root: Root;
let visible: string[];
// Keep one component identity when updating the data, as the real journal does.
let props: { ids: string[]; scope: string; isLoading: boolean };
function Harness() {
  visible = usePacedJournalEvents(props.ids, props.scope, props.isLoading);
  return null;
}
function update(ids: string[], scope = 'session:1', isLoading = false) {
  props = { ids, scope, isLoading };
  act(() => root.render(<Harness />));
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  root = createRoot(document.createElement('div'));
});
afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('shows saved history immediately and reveals only new events one at a time', () => {
  update(['saved']);
  expect(visible).toEqual(['saved']);
  update(['saved', 'new-1', 'new-2']);
  expect(visible).toEqual(['saved']);
  act(() => vi.advanceTimersByTime(180));
  expect(visible).toEqual(['saved', 'new-1']);
  update(['saved', 'new-1', 'new-2']);
  act(() => vi.advanceTimersByTime(180));
  expect(visible).toEqual(['saved', 'new-1', 'new-2']);
});
it('loads initial history without pacing and discards queued events on session change', () => {
  update([], 'session:1', true);
  update(['historic-1', 'historic-2']);
  expect(visible).toEqual(['historic-1', 'historic-2']);
  update(['historic-1', 'historic-2', 'queued']);
  update(['other'], 'session:2');
  act(() => vi.advanceTimersByTime(1000));
  expect(visible).toEqual(['other']);
});
it('shows new events immediately when reduced motion is requested', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  update(['saved']);
  update(['saved', 'new']);
  expect(visible).toEqual(['saved', 'new']);
});
