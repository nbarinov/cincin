import { createToaster } from '../core/toaster';
import { createPresenter } from '../presenter';
import { attachVisibilityPause } from './attach-visibility-pause';
import type { Toaster } from '../core/types';
import type { Presenter } from '../presenter';

/** A mounted presenter over a fresh toaster. */
function setup(): { t: Toaster; p: Presenter } {
  const t = createToaster();
  const p = createPresenter(t);
  p.mount();
  return { t, p };
}

const detachers: Array<() => void> = [];

function attach(p: Presenter): () => void {
  const detach = attachVisibilityPause(p);
  detachers.push(detach);
  return detach;
}

/** Swaps `document.visibilityState` and fires the transition event. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

const pausedFlags = (p: Presenter) => p.getSnapshot().map((x) => x.paused);
const phases = (p: Presenter) => p.getSnapshot().map((x) => x.phase);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  while (detachers.length > 0) {
    detachers.pop()!();
  }
  // Restore the prototype getter jsdom provides.
  delete (document as { visibilityState?: unknown }).visibilityState;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('attachVisibilityPause', () => {
  it('should freeze every running toast when the document hides', () => {
    const { t, p } = setup();
    t.message('a');
    t.message('b');
    attach(p);

    setVisibility('hidden');

    expect(pausedFlags(p)).toEqual([true, true]);
  });

  it('should keep time still while hidden and resume on visible', () => {
    const { t, p } = setup();
    t.message('a');
    attach(p);

    setVisibility('hidden');
    vi.advanceTimersByTime(60_000);
    expect(phases(p)).toEqual(['active']);

    setVisibility('visible');
    expect(pausedFlags(p)).toEqual([false]);
    vi.advanceTimersByTime(4000);
    expect(phases(p)).toEqual(['leaving']);
  });

  it('should leave a foreign pause frozen after visible', () => {
    const { t, p } = setup();
    const hovered = t.message('hovered');
    t.message('running');
    const key = p.getSnapshot().find((x) => x.entry.id === hovered)!.key;
    p.pause(key);
    attach(p);

    setVisibility('hidden');
    setVisibility('visible');

    const byKey = (k: string) => p.getSnapshot().find((x) => x.key === k)!;
    expect(byKey(key).paused).toBe(true);
    expect(p.getSnapshot().filter((x) => x.key !== key)[0]!.paused).toBe(false);
  });

  it('should freeze a toast that enters while hidden', () => {
    const { t, p } = setup();
    attach(p);

    setVisibility('hidden');
    t.message('from background work');

    expect(pausedFlags(p)).toEqual([true]);
    vi.advanceTimersByTime(60_000);
    expect(phases(p)).toEqual(['active']);

    setVisibility('visible');
    expect(pausedFlags(p)).toEqual([false]);
  });

  it('should re-freeze a foreign resume while hidden and adopt it', () => {
    const { t, p } = setup();
    t.message('a');
    p.pause();
    attach(p);

    setVisibility('hidden');
    // A collapse timer scheduled before the tab left fires in the dark.
    p.resume();
    expect(pausedFlags(p)).toEqual([true]);

    setVisibility('visible');
    // The previous owner relinquished: now the freeze was ours to lift.
    expect(pausedFlags(p)).toEqual([false]);
  });

  it('should freeze right away when attached into a hidden document', () => {
    const { t, p } = setup();
    t.message('a');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });

    attach(p);

    expect(pausedFlags(p)).toEqual([true]);
  });

  it('should thaw and stop listening on detach', () => {
    const { t, p } = setup();
    t.message('a');
    const detach = attach(p);

    setVisibility('hidden');
    expect(pausedFlags(p)).toEqual([true]);

    detach();
    // Detaching must not strand frozen timers.
    expect(pausedFlags(p)).toEqual([false]);

    setVisibility('hidden');
    expect(pausedFlags(p)).toEqual([false]);
  });
});
