interface TimerEntry {
  /** `performance.now()` at start/resume. Monotonic clock for duration math. */
  startedAt: number;
  /** Remainder frozen at pause time. For a ticking timer, the full current interval. */
  remaining: number;
  /** `null` = not ticking (paused or `Infinity`) */
  handle: ReturnType<typeof setTimeout> | null;
  onExpire: () => void;
}

/**
 * Generic pausable timer set. Knows nothing about toasts: keys and milliseconds in,
 * expiration callbacks out. Policy (what to start, when to pause, what expiry means)
 * belongs to the caller.
 *
 * Invariant kept by the Toaster facade: every active toast has an entry here,
 * including `Infinity` ones, so `remaining()` answers lifetime questions uniformly.
 */
class TimerManager<Key> {
  #entries = new Map<Key, TimerEntry>();

  /** Repeated start for a live key silently restarts the timer. */
  start(key: Key, ms: number, onExpire: () => void): void {
    this.cancel(key);

    if (ms === Infinity) {
      // The entry exists (remaining stays honest), but nothing ticks.
      this.#entries.set(key, {
        startedAt: performance.now(),
        remaining: Infinity,
        handle: null,
        onExpire,
      });
      return;
    }

    const handle = setTimeout(() => {
      this.#entries.delete(key);
      onExpire();
    }, ms);

    this.#entries.set(key, {
      startedAt: performance.now(),
      remaining: ms,
      handle,
      onExpire,
    });
  }

  /** Idempotent: no entry, already paused, or `Infinity`. Nothing to do. */
  pause(key: Key): void {
    const entry = this.#entries.get(key);
    if (entry === undefined || entry.handle === null) {
      return;
    }

    clearTimeout(entry.handle);
    entry.handle = null;
    // Clamp at zero: a blocked event loop can delay the timeout callback,
    // so the elapsed time may exceed the interval at pause time.
    entry.remaining = Math.max(
      0,
      entry.remaining - (performance.now() - entry.startedAt)
    );
  }

  /** Idempotent: no entry, already ticking, or `Infinity`. Nothing to do. */
  resume(key: Key): void {
    const entry = this.#entries.get(key);
    if (
      entry === undefined ||
      entry.handle !== null ||
      entry.remaining === Infinity
    ) {
      return;
    }

    entry.startedAt = performance.now();
    entry.handle = setTimeout(() => {
      this.#entries.delete(key);
      entry.onExpire();
    }, entry.remaining);
  }

  cancel(key: Key): void {
    const entry = this.#entries.get(key);
    if (entry === undefined) {
      return;
    }

    if (entry.handle !== null) {
      clearTimeout(entry.handle);
    }
    this.#entries.delete(key);
  }

  clear(): void {
    for (const key of Array.from(this.#entries.keys())) {
      this.cancel(key);
    }
  }

  /**
   * 0 for an unknown key (nothing to tick), `Infinity` for a non-expiring entry,
   * frozen remainder while paused, live countdown otherwise.
   */
  remaining(key: Key): number {
    const entry = this.#entries.get(key);
    if (entry === undefined) {
      return 0;
    }

    if (entry.handle === null) {
      // Paused (frozen remainder) or `Infinity`: time stands still.
      return entry.remaining;
    }

    return Math.max(0, entry.remaining - (performance.now() - entry.startedAt));
  }

  has(key: Key): boolean {
    return this.#entries.has(key);
  }
}

export { TimerManager };
