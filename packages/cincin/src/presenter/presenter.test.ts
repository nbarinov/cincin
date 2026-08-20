import { createToaster } from '../core/toaster';
import { createPresenter } from './presenter';
import type { Toaster } from '../core/types';
import type { Presenter, ToastEvent } from './types';

declare const console: { warn(...args: unknown[]): void };

/** A mounted presenter over a fresh toaster, with an event log. */
function setup(config?: Parameters<typeof createPresenter>[1]): {
  t: Toaster;
  p: Presenter;
  events: ToastEvent[];
} {
  const t = createToaster();
  const p = createPresenter(t, config);
  const events: ToastEvent[] = [];
  p.subscribe((event) => events.push(event));
  p.mount();
  return { t, p, events };
}

const phases = (p: Presenter) => p.getSnapshot().map((x) => x.phase);
const keys = (p: Presenter) => p.getSnapshot().map((x) => x.key);

describe('presenter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('mount', () => {
    it('should show nothing until mounted', () => {
      const t = createToaster();
      const p = createPresenter(t);
      t.message('early');

      expect(p.getSnapshot()).toEqual([]);

      p.mount();
      expect(phases(p)).toEqual(['active']);
      expect(p.getSnapshot().at(0)!.entry.content).toBe('early');
    });

    it('should enter the existing records in one batch on mount', () => {
      const t = createToaster();
      t.message('a');
      t.message('b');
      const p = createPresenter(t);
      const batches: number[] = [];
      let current = 0;
      p.subscribe(() => {
        current += 1;
      });

      p.mount();
      batches.push(current);

      expect(batches).toEqual([2]);
      expect(p.getSnapshot()).toHaveLength(2);
    });

    it('should drop every presentation and stop the clocks on unmount, leaving the store alone', () => {
      const { t, p, events } = setup();
      t.message('a', { duration: 1000 });
      t.message('b');

      p.unmount();

      expect(p.getSnapshot()).toEqual([]);
      expect(events.filter((e) => e.type === 'left')).toHaveLength(2);
      expect(t.getSnapshot()).toHaveLength(2); // records untouched

      // The expiry clock is gone with the presentation: nothing fires.
      vi.advanceTimersByTime(5000);
      expect(t.getSnapshot()).toHaveLength(2);
    });

    it('should stop following the store while unmounted and replay on remount', () => {
      const { t, p } = setup();
      p.unmount();

      t.message('while unmounted');
      expect(p.getSnapshot()).toEqual([]);

      p.mount();
      expect(p.getSnapshot().map((x) => x.entry.content)).toEqual([
        'while unmounted',
      ]);
    });

    it('should count mounts and unmount on the last one', () => {
      const { t, p } = setup();
      p.mount(); // second consumer
      t.message('a');

      p.unmount();
      expect(p.getSnapshot()).toHaveLength(1); // still mounted

      p.unmount();
      expect(p.getSnapshot()).toEqual([]);
    });
  });

  describe('entering', () => {
    it('should give every showing its own key, distinct from the record id', () => {
      const { t, p } = setup();
      const id = t.message('a');

      const [presentation] = p.getSnapshot();
      expect(presentation!.entry.id).toBe(id);
      expect(presentation!.key).not.toBe(id);
      expect(presentation!.key).toMatch(/^p-[a-z0-9]+-1$/);
    });

    it('should reference the record, not copy it', () => {
      const { t, p } = setup();
      t.message('a');

      expect(p.getSnapshot().at(0)!.entry).toBe(t.getSnapshot().at(0));
    });

    it('should follow record updates on a live presentation', () => {
      const { t, p, events } = setup();
      const id = t.message('a');

      t.update(id, { content: 'b' });

      expect(p.getSnapshot()).toHaveLength(1);
      expect(p.getSnapshot().at(0)!.entry.content).toBe('b');
      expect(events.at(-1)).toMatchObject({
        type: 'updated',
        toast: { entry: { content: 'b' } },
        prev: { entry: { content: 'a' } },
      });
    });
  });

  describe('queue', () => {
    it('should queue beyond max and promote in the same batch a slot frees', () => {
      const { t, p, events } = setup({ max: 1 });
      t.message('a');
      t.message('b');

      expect(phases(p)).toEqual(['active', 'queued']);

      const [first] = keys(p);
      events.length = 0;
      p.dismiss(first!);

      expect(phases(p)).toEqual(['leaving', 'active']);
      expect(events.map((e) => e.type)).toEqual(['leaving', 'updated']);
    });

    it('should promote the oldest queued presentation first', () => {
      const { t, p } = setup({ max: 1 });
      t.message('a');
      t.message('b');
      t.message('c');

      p.dismiss(keys(p)[0]!);

      expect(
        p.getSnapshot().map((x) => `${x.entry.content}:${x.phase}`)
      ).toEqual(['a:leaving', 'b:active', 'c:queued']);
    });

    it('should warn when max cannot show any toast', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      createPresenter(createToaster(), { max: 0 });

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('max below 1'),
        0
      );
      warn.mockRestore();
    });
  });

  describe('expiry', () => {
    it('should dismiss an active presentation after its duration', () => {
      const { t, p } = setup();
      t.message('a', { duration: 1000 });

      vi.advanceTimersByTime(999);
      expect(phases(p)).toEqual(['active']);

      vi.advanceTimersByTime(1);
      expect(phases(p)).toEqual(['leaving']);
    });

    it('should never expire an Infinity presentation', () => {
      const { t, p } = setup();
      t.loading('forever');

      vi.advanceTimersByTime(60_000);
      expect(phases(p)).toEqual(['active']);
    });

    it('should not tick while queued and start on promotion', () => {
      const { t, p } = setup({ max: 1 });
      t.message('a', { duration: Infinity });
      t.message('b', { duration: 1000 });

      vi.advanceTimersByTime(5000);
      expect(phases(p)).toEqual(['active', 'queued']);

      p.dismiss(keys(p)[0]!);
      vi.advanceTimersByTime(999);
      expect(phases(p)).toEqual(['leaving', 'active']);
      vi.advanceTimersByTime(1);
      expect(phases(p)).toEqual(['leaving', 'leaving']);
    });

    it('should restart the clock on an explicit duration touch, even with the same value', () => {
      const { t, p } = setup();
      const id = t.message('a', { duration: 1000 });

      vi.advanceTimersByTime(900);
      t.update(id, { duration: 1000 });
      vi.advanceTimersByTime(900);

      expect(phases(p)).toEqual(['active']); // 1800ms in, still alive
      vi.advanceTimersByTime(100);
      expect(phases(p)).toEqual(['leaving']);
    });

    it('should restart with the type default when the type changes', () => {
      const { t, p } = setup();
      const id = t.loading('working');

      vi.advanceTimersByTime(60_000);
      t.update(id, { type: 'success' }); // Infinity -> 4000

      vi.advanceTimersByTime(3999);
      expect(phases(p)).toEqual(['active']);
      vi.advanceTimersByTime(1);
      expect(phases(p)).toEqual(['leaving']);
    });

    it('should not restart the clock on a content-only update', () => {
      const { t, p } = setup();
      const id = t.message('a', { duration: 1000 });

      vi.advanceTimersByTime(900);
      t.update(id, { content: 'b' });
      vi.advanceTimersByTime(100);

      expect(phases(p)).toEqual(['leaving']);
    });

    it('should report Infinity remaining for an active permanent toast', () => {
      const { t, p } = setup();
      t.loading('forever');

      // Not 0: an active Infinity toast is alive, not expired, and the
      // answer matches what the same toast reported while queued.
      expect(p.getRemainingMs(keys(p)[0]!)).toBe(Infinity);
    });

    it('should freeze the new duration when a paused toast is touched', () => {
      const { t, p } = setup();
      const id = t.message('a', { duration: 1000 });
      const [key] = keys(p);

      vi.advanceTimersByTime(600);
      p.pause(key!);
      t.update(id, { duration: 2000 });

      vi.advanceTimersByTime(5000);
      expect(phases(p)).toEqual(['active']); // still frozen

      p.resume(key!);
      vi.advanceTimersByTime(1999);
      expect(phases(p)).toEqual(['active']); // the full new duration
      vi.advanceTimersByTime(1);
      expect(phases(p)).toEqual(['leaving']);
    });

    it('should report the remaining time by phase', () => {
      const { t, p } = setup({ max: 1 });
      t.message('a', { duration: 1000 });
      t.message('b', { duration: 2000 });
      const [active, queued] = keys(p);

      vi.advanceTimersByTime(400);
      expect(p.getRemainingMs(active!)).toBe(600);
      expect(p.getRemainingMs(queued!)).toBe(2000); // full, not started

      p.dismiss(active!);
      expect(p.getRemainingMs(active!)).toBe(0);
      expect(p.getRemainingMs('nope')).toBe(0);
    });
  });

  describe('pause and resume', () => {
    it('should freeze the remainder on pause and finish it after resume', () => {
      const { t, p } = setup();
      t.message('a', { duration: 1000 });
      const [key] = keys(p);

      vi.advanceTimersByTime(600);
      p.pause(key!);
      expect(p.getSnapshot().at(0)!.paused).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(phases(p)).toEqual(['active']);

      p.resume(key!);
      vi.advanceTimersByTime(399);
      expect(phases(p)).toEqual(['active']);
      vi.advanceTimersByTime(1);
      expect(phases(p)).toEqual(['leaving']);
    });

    it('should promote a paused queued presentation frozen', () => {
      const { t, p } = setup({ max: 1 });
      t.message('a');
      t.message('b', { duration: 1000 });
      p.pause(); // everything, the queued one included

      p.dismiss(keys(p)[0]!);
      const promoted = () =>
        p.getSnapshot().find((x) => x.entry.content === 'b')!;
      expect(promoted()).toMatchObject({ phase: 'active', paused: true });

      // Long past its duration (and past the ghost's safety net): frozen.
      vi.advanceTimersByTime(5000);
      expect(promoted().phase).toBe('active');

      // The frozen clock exists and resumes with the full remainder: a
      // promotion under pause must not lose the expiry entry.
      p.resume();
      vi.advanceTimersByTime(999);
      expect(promoted().phase).toBe('active');
      vi.advanceTimersByTime(1);
      expect(promoted().phase).toBe('leaving');
    });

    it('should not pause a leaving presentation so the safety net keeps ticking', () => {
      const { t, p } = setup({ removeTimeout: 500 });
      t.message('a');
      const [key] = keys(p);
      p.dismiss(key!);

      p.pause(key!);
      expect(p.getSnapshot().at(0)!.paused).toBe(false);

      vi.advanceTimersByTime(500);
      expect(p.getSnapshot()).toEqual([]);
    });
  });

  describe('leaving and finishing', () => {
    it('should keep a leaving presentation in the snapshot until finished', () => {
      const { t, p } = setup();
      t.message('a');
      const [key] = keys(p);

      p.dismiss(key!);
      expect(phases(p)).toEqual(['leaving']);

      p.finish(key!);
      expect(p.getSnapshot()).toEqual([]);
    });

    it('should remove the record once its last presentation finished', () => {
      const { t, p } = setup();
      t.message('a');
      const [key] = keys(p);

      p.dismiss(key!);
      expect(t.getSnapshot()).toHaveLength(1); // still stored while leaving

      p.finish(key!);
      expect(t.getSnapshot()).toEqual([]);
    });

    it('should publish left before the record leaves the store', () => {
      const { t, p } = setup();
      t.message('a');
      const [key] = keys(p);
      const order: string[] = [];
      p.subscribe((e) => order.push(`presenter:${e.type}`));
      t.subscribe((e) => order.push(`store:${e.type}`));

      p.dismiss(key!);
      p.finish(key!);

      expect(order).toEqual([
        'presenter:leaving',
        'presenter:left',
        'store:removed',
      ]);
    });

    it('should finish a leaving presentation on its own after removeTimeout', () => {
      const { t, p } = setup({ removeTimeout: 500 });
      t.message('a');
      p.dismiss(keys(p)[0]!);

      vi.advanceTimersByTime(499);
      expect(phases(p)).toEqual(['leaving']);
      vi.advanceTimersByTime(1);
      expect(p.getSnapshot()).toEqual([]);
      expect(t.getSnapshot()).toEqual([]);
    });

    it('should not emit a second leaving for an already leaving presentation', () => {
      const { t, p, events } = setup();
      t.message('a');
      const [key] = keys(p);

      p.dismiss(key!);
      events.length = 0;
      p.dismiss(key!);

      expect(events).toEqual([]);
    });

    it('should treat finish on a gone key as a no-op', () => {
      const { p } = setup();

      expect(() => p.finish('p-nope-1')).not.toThrow();
    });
  });

  describe('ghosts', () => {
    it('should turn the presentation of a removed record into a leaving ghost', () => {
      const { t, p } = setup();
      const id = t.message('a');

      t.remove(id);

      expect(t.getSnapshot()).toEqual([]);
      expect(phases(p)).toEqual(['leaving']);
      // The ghost keeps the last record it saw.
      expect(p.getSnapshot().at(0)!.entry.content).toBe('a');
    });

    it('should let a ghost finish without touching the store again', () => {
      const { t, p } = setup();
      const id = t.message('a');
      t.remove(id);
      const [key] = keys(p);
      const storeEvents: string[] = [];
      t.subscribe((e) => storeEvents.push(e.type));

      p.finish(key!);

      expect(p.getSnapshot()).toEqual([]);
      expect(storeEvents).toEqual([]); // no second removed
    });

    it('should open a fresh toast for a create over a leaving entry (dead means dead)', () => {
      const { t, p } = setup();
      const id = t.message('a');
      const [ghostKey] = keys(p);
      p.dismiss(ghostKey!);

      t.create('b', { id });

      expect(
        p.getSnapshot().map((x) => `${x.entry.content}:${x.phase}`)
      ).toEqual(['a:leaving', 'b:active']);
      expect(keys(p)[1]).not.toBe(ghostKey);
    });

    it('should swallow a plain update on a leaving entry', () => {
      const { t, p } = setup();
      const id = t.message('a');
      const [key] = keys(p);
      p.dismiss(key!);

      // A promise settling after the user dismissed it goes this way:
      // the record updates in the store, but nothing reopens on screen.
      t.update(id, { content: 'b' });

      expect(phases(p)).toEqual(['leaving']);
      expect(p.getSnapshot().at(0)!.entry.content).toBe('a'); // the ghost froze

      p.finish(key!);
      expect(p.getSnapshot()).toEqual([]);
      expect(t.getSnapshot()).toEqual([]); // the ghost took the record along
    });

    it('should keep the record while a fresh presentation is alive after the ghost finishes', () => {
      const { t, p } = setup();
      const id = t.message('a');
      const [ghostKey] = keys(p);
      p.dismiss(ghostKey!);
      t.create('b', { id });

      p.finish(ghostKey!);

      expect(t.getSnapshot()).toHaveLength(1); // the live presentation still owns it
      expect(phases(p)).toEqual(['active']);
    });
  });

  describe('commands', () => {
    it('should act on every presentation when called without arguments', () => {
      const { t, p } = setup();
      t.message('a');
      t.message('b');

      p.dismiss();

      expect(phases(p)).toEqual(['leaving', 'leaving']);
    });

    it('should warn and do nothing on an explicit undefined key', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { t, p } = setup();
      t.message('a');

      p.dismiss(undefined as unknown as string);

      expect(phases(p)).toEqual(['active']);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('undefined key')
      );
      warn.mockRestore();
    });

    it('should deduplicate keys within one call and commit once', () => {
      const { t, p, events } = setup();
      t.message('a');
      const [key] = keys(p);
      events.length = 0;

      p.dismiss([key!, key!]);

      expect(events.filter((e) => e.type === 'leaving')).toHaveLength(1);
    });

    it('should warn about an unknown key and carry on with the rest', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { t, p } = setup();
      t.message('a');
      const [key] = keys(p);

      p.dismiss(['p-nope-1', key!]);

      expect(phases(p)).toEqual(['leaving']);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('toast not found'),
        'p-nope-1'
      );
      warn.mockRestore();
    });
  });
});
