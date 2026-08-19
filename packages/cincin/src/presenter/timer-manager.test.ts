import { TimerManager } from './timer-manager';

describe('TimerManager', () => {
  // Note: vitest fake timers mock `performance.now` too,
  // so `advanceTimersByTime` moves both clocks consistently.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fire onExpire after the given time and forget the entry', () => {
    const timers = new TimerManager<string>();
    const onExpire = vi.fn();

    timers.start('a', 1000, onExpire);
    vi.advanceTimersByTime(999);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timers.has('a')).toBe(false);
    expect(timers.remaining('a')).toBe(0);
  });

  it('should keep an Infinity entry that never ticks', () => {
    const timers = new TimerManager<string>();
    const onExpire = vi.fn();

    timers.start('a', Infinity, onExpire);
    vi.advanceTimersByTime(1_000_000);

    expect(onExpire).not.toHaveBeenCalled();
    expect(timers.has('a')).toBe(true);
    expect(timers.remaining('a')).toBe(Infinity);
  });

  it('should freeze remaining on pause and resume for exactly the rest', () => {
    const timers = new TimerManager<string>();
    const onExpire = vi.fn();

    timers.start('a', 5000, onExpire);
    vi.advanceTimersByTime(2000);

    timers.pause('a');
    vi.advanceTimersByTime(10_000); // time passes, remainder must not move
    expect(timers.remaining('a')).toBe(3000);
    expect(onExpire).not.toHaveBeenCalled();

    timers.resume('a');
    vi.advanceTimersByTime(2999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('should be idempotent for pause on paused and resume on ticking', () => {
    const timers = new TimerManager<string>();
    const onExpire = vi.fn();

    timers.start('a', 5000, onExpire);
    vi.advanceTimersByTime(1000);

    timers.pause('a');
    timers.pause('a'); // second pause must not double-subtract
    expect(timers.remaining('a')).toBe(4000);

    timers.resume('a');
    timers.resume('a'); // second resume must not double-schedule
    vi.advanceTimersByTime(4000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('should silently restart on repeated start with a new interval', () => {
    const timers = new TimerManager<string>();
    const first = vi.fn();
    const second = vi.fn();

    timers.start('a', 1000, first);
    vi.advanceTimersByTime(500);
    timers.start('a', 2000, second);

    vi.advanceTimersByTime(1999);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(first).not.toHaveBeenCalled(); // the old timer is gone
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('should cancel a pending timer so onExpire never fires', () => {
    const timers = new TimerManager<string>();
    const onExpire = vi.fn();

    timers.start('a', 1000, onExpire);
    timers.cancel('a');
    vi.advanceTimersByTime(5000);

    expect(onExpire).not.toHaveBeenCalled();
    expect(timers.has('a')).toBe(false);
  });

  it('should clear all entries at once', () => {
    const timers = new TimerManager<string>();
    const a = vi.fn();
    const b = vi.fn();

    timers.start('a', 1000, a);
    timers.start('b', Infinity, b);
    timers.clear();
    vi.advanceTimersByTime(5000);

    expect(a).not.toHaveBeenCalled();
    expect(timers.has('a')).toBe(false);
    expect(timers.has('b')).toBe(false);
  });

  it('should report 0 remaining for unknown keys', () => {
    const timers = new TimerManager<string>();
    expect(timers.remaining('ghost')).toBe(0);
  });

  it('should allow onExpire to start a timer for the same key', () => {
    // The entry is deleted before onExpire runs, so a synchronous restart
    // from inside the callback must not collide with a stale entry.
    const timers = new TimerManager<string>();
    const second = vi.fn();

    timers.start('a', 1000, () => {
      timers.start('a', 500, second);
    });

    vi.advanceTimersByTime(1000);
    expect(timers.has('a')).toBe(true);

    vi.advanceTimersByTime(500);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
