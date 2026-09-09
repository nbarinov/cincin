import { createToaster } from '../core/toaster';
import { createPresenterHolder } from './holder';
import { createPresenter } from './presenter';
import type { Toaster } from '../core/types';
import type { Presenter } from './types';

/** A mounted presenter over a fresh toaster. */
function setup(): { t: Toaster; p: Presenter } {
  const t = createToaster();
  const p = createPresenter(t);
  p.mount();
  return { t, p };
}

const pausedFlags = (p: Presenter) => p.getSnapshot().map((x) => x.paused);
const phases = (p: Presenter) => p.getSnapshot().map((x) => x.phase);

describe('createPresenterHolder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should take a presenter of any content', () => {
    const t = createToaster<{ title: string }>();
    const p = createPresenter(t);
    p.mount();
    t.message({ title: 'object content' });

    const holder = createPresenterHolder(p);
    holder.hold('viewport');

    expect(p.getSnapshot().map((x) => x.paused)).toEqual([true]);
  });

  it('should start released', () => {
    const { p } = setup();
    const holder = createPresenterHolder(p);

    expect(holder.held()).toBe(false);
    expect(pausedFlags(p)).toEqual([]);
  });

  it('should freeze every running toast on the first hold', () => {
    const { t, p } = setup();
    t.message('a');
    t.message('b');
    const holder = createPresenterHolder(p);

    holder.hold('viewport');

    expect(holder.held()).toBe(true);
    expect(pausedFlags(p)).toEqual([true, true]);
    vi.advanceTimersByTime(60_000);
    expect(phases(p)).toEqual(['active', 'active']);
  });

  it('should thaw on the last release and let the clocks run out', () => {
    const { t, p } = setup();
    t.message('a');
    const holder = createPresenterHolder(p);

    holder.hold('viewport');
    holder.release('viewport');

    expect(holder.held()).toBe(false);
    expect(pausedFlags(p)).toEqual([false]);
    vi.advanceTimersByTime(4000);
    expect(phases(p)).toEqual(['leaving']);
  });

  it('should keep the freeze while any name still holds', () => {
    // The defect the holder exists for: the stack open under the
    // pointer, the tab hidden, then shown again. The visibility source
    // releasing must not thaw what the viewport still holds.
    const { t, p } = setup();
    t.message('a');
    const holder = createPresenterHolder(p);

    holder.hold('viewport');
    holder.hold('hidden');
    t.message('entered while both held');
    holder.release('hidden');

    expect(pausedFlags(p)).toEqual([true, true]);

    holder.release('viewport');
    expect(pausedFlags(p)).toEqual([false, false]);
  });

  it('should freeze a toast that enters while held', () => {
    const { t, p } = setup();
    const holder = createPresenterHolder(p);
    holder.hold('hidden');

    t.message('from background work');

    expect(pausedFlags(p)).toEqual([true]);
    vi.advanceTimersByTime(60_000);
    expect(phases(p)).toEqual(['active']);

    holder.release('hidden');
    expect(pausedFlags(p)).toEqual([false]);
  });

  it('should leave a pause set by someone else alone', () => {
    const { t, p } = setup();
    const foreign = t.message('paused by app code');
    t.message('running');
    const key = p.getSnapshot().find((x) => x.entry.id === foreign)!.key;
    p.pause(key);
    const holder = createPresenterHolder(p);

    holder.hold('viewport');
    holder.release('viewport');

    const byKey = (k: string) => p.getSnapshot().find((x) => x.key === k)!;
    expect(byKey(key).paused).toBe(true);
    expect(p.getSnapshot().filter((x) => x.key !== key)[0]!.paused).toBe(false);
  });

  it('should ignore a repeated hold of the same name and its extra release', () => {
    const { t, p } = setup();
    t.message('a');
    const holder = createPresenterHolder(p);

    holder.hold('viewport');
    holder.hold('viewport');
    holder.release('viewport');

    expect(holder.held()).toBe(false);
    expect(pausedFlags(p)).toEqual([false]);

    // A release of a name nobody holds is nothing.
    holder.release('viewport');
    expect(pausedFlags(p)).toEqual([false]);
  });

  it('should return a release bound to the name', () => {
    const { t, p } = setup();
    t.message('a');
    const holder = createPresenterHolder(p);

    const release = holder.hold('viewport');
    expect(pausedFlags(p)).toEqual([true]);

    release();
    expect(pausedFlags(p)).toEqual([false]);

    // Idempotent: a cleanup run twice is routine.
    release();
    expect(holder.held()).toBe(false);
  });

  it('should forget a toast that left while held', () => {
    const { t, p } = setup();
    const id = t.message('a');
    const holder = createPresenterHolder(p);
    holder.hold('viewport');

    t.remove(id);
    vi.advanceTimersByTime(2050);
    expect(p.count()).toBe(0);

    // Releasing must not resume a key that is gone (no warning, no throw).
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    holder.release('viewport');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should not adopt a foreign resume while held', () => {
    // The holder is the one holder: app code resuming under it is
    // app code's call, not something to fight.
    const { t, p } = setup();
    t.message('a');
    const holder = createPresenterHolder(p);
    holder.hold('viewport');

    p.resume();

    expect(pausedFlags(p)).toEqual([false]);
    holder.release('viewport');
    expect(pausedFlags(p)).toEqual([false]);
  });
});
