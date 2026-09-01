import { createToaster } from '../core/toaster';
import { createPresenter } from './presenter';
import type { Presenter, Toast, ToastKey } from './types';

/**
 * The completeness contract of the event channel: a follower seeded
 * from one snapshot and fed nothing but events — it never calls
 * getSnapshot to correct itself — stays equal to the snapshot at every
 * commit boundary. Adapters lean on this literally (the Solid skin
 * materializes its projection exactly this way), so a store mutation
 * that slips past the channel is a bug here first.
 *
 * The follower also pins the channel's inner grammar as it applies
 * events: a key enters at most once, `updated`/`leaving`/`left` only
 * ever name a key the channel introduced, and an update's `prev` is
 * the toast the follower already holds (the events chain, even inside
 * a multi-event commit).
 */
function follow(presenter: Presenter): { sync: () => void } {
  const replica = new Map<ToastKey, Toast>(
    presenter.getSnapshot().map((toast) => [toast.key, toast])
  );

  presenter.subscribe((event) => {
    const key = event.toast.key;

    switch (event.type) {
      case 'entered':
        expect(replica.has(key)).toBe(false);
        replica.set(key, event.toast);
        break;
      case 'updated':
        expect(event.prev).toBe(replica.get(key));
        replica.set(key, event.toast);
        break;
      case 'leaving':
        expect(replica.has(key)).toBe(true);
        replica.set(key, event.toast);
        break;
      case 'left':
        expect(replica.has(key)).toBe(true);
        replica.delete(key);
        break;
    }
  });

  return {
    // Content AND order: entries ride Map insertion order on both
    // sides, so the arrays must agree index by index. The check sits
    // at commit boundaries on purpose — inside a multi-event commit
    // the snapshot is already ahead of the half-delivered log.
    sync: () => {
      expect([...replica.values()]).toEqual(presenter.getSnapshot());
    },
  };
}

describe('presenter event channel contract', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep a follower in sync through the full lifecycle', () => {
    const t = createToaster();
    const p = createPresenter(t, { max: 2, exitDuration: 400 });
    const { sync } = follow(p);
    const key = (index: number) => p.getSnapshot().at(index)!.key;

    p.mount();
    sync();

    // Entries, including one that queues behind max. Everything but
    // the first is eternal: the clock steps below must expire exactly
    // one toast, not race the whole stack away.
    const updatable = t.message('one', { duration: 1000 });
    t.message('two', { duration: Infinity });
    t.message('three', { duration: Infinity });
    sync();
    expect(p.getSnapshot().map((x) => x.phase)).toEqual([
      'active',
      'active',
      'queued',
    ]);

    // A content refresh on a live toast.
    t.update(updatable, { content: 'one, updated' });
    sync();

    // Pauses, per key and wholesale.
    p.pause(key(0));
    sync();
    p.resume();
    sync();

    // A raised max promotes the queued toast.
    p.setOptions({ max: 3 });
    sync();
    expect(p.getSnapshot().map((x) => x.phase)).toEqual([
      'active',
      'active',
      'active',
    ]);

    // A fourth toast queues behind the filled max; its expiry clock
    // must start on the promotion below, not now.
    t.message('four', { duration: 1000 });
    sync();
    expect(p.getSnapshot().at(3)!.phase).toBe('queued');

    // The dismissal frees a slot: leaving plus the follow-up promotion
    // land in one multi-event commit.
    p.dismiss(key(0));
    sync();
    expect(p.getSnapshot().map((x) => x.phase)).toEqual([
      'leaving',
      'active',
      'active',
      'active',
    ]);

    // The finished exit removes the record.
    p.finish(key(0));
    sync();

    // The expiry clock turns the promoted toast leaving on its own...
    vi.advanceTimersByTime(1000);
    sync();
    expect(p.getSnapshot().map((x) => x.phase)).toContain('leaving');
    // ...and the exit clock finishes it for the skin that never calls.
    vi.advanceTimersByTime(5000);
    sync();

    // Removing the backing entry dismisses through the store.
    t.remove(t.getSnapshot().at(0)!.id);
    sync();

    expect(p.getSnapshot().length).toBeGreaterThan(0);

    // The final unmount drops everything — leaving ghosts included —
    // through the channel.
    p.unmount();
    sync();
    expect(p.getSnapshot()).toEqual([]);
  });

  it('should let a follower seeded mid-flight continue on events alone', () => {
    const t = createToaster();
    const p = createPresenter(t);
    p.mount();
    t.message('before the follower');
    t.message('also before');
    p.dismiss(p.getSnapshot().at(0)!.key); // a leaving ghost in the seed

    const { sync } = follow(p);
    sync();

    t.message('after the follower');
    sync();
    p.dismiss();
    sync();
    p.unmount();
    sync();
  });

  it('should rebuild a remount through the channel alone', () => {
    const t = createToaster();
    const p = createPresenter(t);
    p.mount();
    const { sync } = follow(p);

    const id = t.message('a');
    p.dismiss(p.getSnapshot().at(0)!.key);
    t.create('b', { id }); // dead means dead: a ghost and a fresh toast share the id
    sync();

    p.unmount();
    sync();
    expect(p.getSnapshot()).toEqual([]);

    // The surviving entry re-enters as a brand-new presentation: for
    // the channel it is an `entered`, nothing is replayed from before.
    p.mount();
    sync();
    expect(p.getSnapshot().map((x) => x.entry.content)).toEqual(['b']);
  });
});
