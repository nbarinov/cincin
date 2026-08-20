import { TimerManager } from './timer-manager';
import { Mountable } from '../shared/mountable';
import { counter, devWarn } from '../shared/utils';
import { createPresenterStore } from './store';
import type { ToastEntry, Toaster, ToastId, UpdatePatch } from '../core/types';
import type {
  Toast,
  ToastKey,
  ToastEnteredEvent,
  ToastLeavingEvent,
  ToastUpdatedEvent,
  ToastEvent,
  Presenter as PresenterContract,
  PresenterConfig,
} from './types';

/**
 * Shows a toaster's entries: one toast per showing, with a queue (max),
 * an expiry clock per toast, pauses, and a leaving phase the renderer
 * finishes. Toasts reference the entries and outlive them as ghosts: a
 * leaving toast keeps the last entry it saw. Several presenters over
 * one toaster are the consumer's coordination; this one removes an
 * entry once none of its toasts remain here.
 */
class Presenter<Content extends {} = string>
  extends Mountable
  implements PresenterContract<Content>
{
  readonly config: Readonly<Required<PresenterConfig>>;

  // Delegates are pre-bound by their owners.
  readonly subscribe: PresenterContract<Content>['subscribe'];
  readonly getSnapshot: PresenterContract<Content>['getSnapshot'];

  #toaster: Toaster<Content>;
  #store = createPresenterStore<Content>();
  #expiryTimers = new TimerManager<ToastKey>();
  #leaveTimers = new TimerManager<ToastKey>();

  #unsubscribe: (() => void) | undefined;
  #keyCounter = counter();
  #keySalt = Math.random().toString(36).slice(2, 6);

  constructor(toaster: Toaster<Content>, config: PresenterConfig = {}) {
    super();

    this.#toaster = toaster;
    this.config = Object.freeze({
      max: config.max ?? Infinity,
      removeTimeout: config.removeTimeout ?? 2000,
    });

    if (this.config.max < 1) {
      devWarn('presenter: max below 1 can never show a toast', this.config.max);
    }

    this.subscribe = this.#store.subscribe;
    this.getSnapshot = this.#store.getSnapshot;

    this.dismiss = this.dismiss.bind(this);
    this.finish = this.finish.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.getRemainingMs = this.getRemainingMs.bind(this);
  }

  // --- lifecycle ---

  protected override onMount(): void {
    // Entries that already exist enter now, in one batch: a presenter
    // mounted after toasts were created still shows them.
    this.#commit(
      ...this.#toaster.getSnapshot().map((entry) => this.#enter(entry))
    );

    this.#unsubscribe = this.#toaster.subscribe((event) => {
      switch (event.type) {
        case 'added':
          this.#commit(this.#enter(event.entry));
          return;

        case 'updated':
          this.#commit(
            ...this.#refresh(event.entry, event.prev, event.patch, event.via)
          );
          return;

        case 'removed':
          this.#commit(...this.#orphan(event.entry.id));
          return;
      }
    });
  }

  protected override onUnmount(): void {
    // No region, nothing to animate: every toast goes at once and the
    // clocks stop. Live toasts keep their entries: time stands still and
    // a remount shows them again.
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#expiryTimers.clear();
    this.#leaveTimers.clear();

    const gone = this.#store.values();
    for (const toast of gone) {
      this.#store.delete(toast.key);
    }

    this.#store.commit(
      ...gone.map((toast) => ({ type: 'left' as const, toast }))
    );

    // Leaving toasts were already on their way out: their exits complete
    // here and their entries go with them, as finish() would have done.
    // An entry a live toast still represented survives for the remount,
    // dead-means-dead included (a ghost and a fresh toast share one id).
    const liveIds = new Set(
      gone
        .filter((toast) => toast.phase !== 'leaving')
        .map((toast) => toast.entry.id)
    );
    for (const toast of gone) {
      if (toast.phase === 'leaving' && !liveIds.has(toast.entry.id)) {
        this.#toaster.remove(toast.entry.id);
      }
    }
  }

  // --- planners: mutate the store, return events, never commit ---

  #enter(entry: ToastEntry<Content>): ToastEnteredEvent<Content> {
    const toast: Toast<Content> = {
      key: `p-${this.#keySalt}-${this.#keyCounter()}`,
      entry,
      phase: this.#hasFreeSlot() ? 'active' : 'queued',
      paused: false,
    };

    this.#store.set(toast);
    if (toast.phase === 'active') {
      this.#startExpiry(toast);
    }

    return { type: 'entered', toast };
  }

  #refresh(
    entry: ToastEntry<Content>,
    prev: ToastEntry<Content>,
    patch: UpdatePatch<Content>,
    via: 'create' | 'update'
  ): ToastEvent<Content>[] {
    const live = this.#store.select(
      (t) => t.entry.id === entry.id && t.phase !== 'leaving'
    );

    if (live.length === 0) {
      // Every toast of this entry is leaving. A create expressed the
      // intent to show: dead means dead, the ghosts play out and the
      // updated entry gets a fresh toast. A plain update did not (a
      // promise settling after the user dismissed it): swallow, and the
      // finishing ghost takes the record with it.
      return via === 'create' ? [this.#enter(entry)] : [];
    }

    // The clock belongs to the duration: an explicit touch (even with the
    // same value) or a type change rewinds it; content-only updates never do.
    const shouldRestart =
      patch.duration !== undefined || entry.type !== prev.type;

    return live.map((toast) => {
      const next: Toast<Content> = { ...toast, entry };
      this.#store.set(next);
      if (shouldRestart && next.phase === 'active') {
        this.#startExpiry(next);
      }

      return { type: 'updated', toast: next, prev: toast, patch };
    });
  }

  #orphan(id: ToastId): ToastEvent<Content>[] {
    // The entry is gone: live toasts start leaving (as ghosts of the
    // last entry they saw), ones already leaving are untouched.
    return this.#store
      .select((t) => t.entry.id === id && t.phase !== 'leaving')
      .map((toast) => this.#leave(toast));
  }

  #leave(toast: Toast<Content>): ToastLeavingEvent<Content> {
    this.#expiryTimers.cancel(toast.key);

    const next: Toast<Content> = { ...toast, phase: 'leaving' };
    this.#store.set(next);

    // Safety net: if nobody finishes the exit, we do. Capture only the key.
    const key = next.key;
    this.#leaveTimers.start(key, this.config.removeTimeout, () =>
      this.finish(key)
    );

    return { type: 'leaving', toast: next };
  }

  #pauseOne(toast: Toast<Content>): ToastUpdatedEvent<Content> | null {
    // Active and queued pause (a paused queued one gets promoted frozen);
    // leaving is excluded: the safety net must keep ticking.
    if (toast.phase === 'leaving' || toast.paused) {
      return null;
    }

    this.#expiryTimers.pause(toast.key);
    const next: Toast<Content> = { ...toast, paused: true };
    this.#store.set(next);

    return { type: 'updated', toast: next, prev: toast };
  }

  #resumeOne(toast: Toast<Content>): ToastUpdatedEvent<Content> | null {
    if (!toast.paused) {
      return null;
    }

    this.#expiryTimers.resume(toast.key);
    const next: Toast<Content> = { ...toast, paused: false };
    this.#store.set(next);

    return { type: 'updated', toast: next, prev: toast };
  }

  // --- commands ---

  dismiss(): void;
  dismiss(key: ToastKey): void;
  dismiss(keys: ToastKey[]): void;
  dismiss(target?: ToastKey | ToastKey[]): void {
    this.#command('dismiss', arguments.length, target, (toast) =>
      toast.phase === 'leaving' ? null : this.#leave(toast)
    );
  }

  pause(): void;
  pause(key: ToastKey): void;
  pause(keys: ToastKey[]): void;
  pause(target?: ToastKey | ToastKey[]): void {
    this.#command('pause', arguments.length, target, (toast) =>
      this.#pauseOne(toast)
    );
  }

  resume(): void;
  resume(key: ToastKey): void;
  resume(keys: ToastKey[]): void;
  resume(target?: ToastKey | ToastKey[]): void {
    this.#command('resume', arguments.length, target, (toast) =>
      this.#resumeOne(toast)
    );
  }

  /** The renderer finished the exit (or the safety net did). */
  finish(key: ToastKey): void {
    const toast = this.#store.get(key);
    if (toast === undefined) {
      // A finish on a gone key is routine (safety net racing the renderer).
      return;
    }

    this.#leaveTimers.cancel(key);
    this.#expiryTimers.cancel(key);
    this.#store.delete(key);
    // Publish `left` before touching the toaster: its `removed` comes back
    // through #orphan and must find this toast already gone.
    this.#commit({ type: 'left', toast });

    // The presenter owns removal: once no toast of the entry remains here,
    // the entry goes. A remove on an already-gone entry is a no-op.
    const id = toast.entry.id;
    if (this.#store.count((t) => t.entry.id === id) === 0) {
      this.#toaster.remove(id);
    }
  }

  getRemainingMs(key: ToastKey): number {
    const toast = this.#store.get(key);
    if (toast === undefined || toast.phase === 'leaving') {
      return 0;
    }

    if (toast.phase === 'queued') {
      // Life has not started yet: the full duration is still ahead.
      return toast.entry.duration;
    }

    return this.#expiryTimers.remaining(key);
  }

  // --- internals ---

  #command(
    name: string,
    arity: number,
    target: ToastKey | ToastKey[] | undefined,
    applyOne: (toast: Toast<Content>) => ToastEvent<Content> | null
  ): void {
    if (arity > 0 && target === undefined) {
      devWarn(`${name}: called with undefined key, did you mean ${name}()?`);
      return;
    }

    const targets: Toast<Content>[] = [];
    if (target === undefined) {
      targets.push(...this.#store.values());
    } else {
      for (const key of new Set(Array.isArray(target) ? target : [target])) {
        const toast = this.#store.get(key);
        if (toast === undefined) {
          devWarn(`${name}: toast not found`, key);
          continue;
        }
        targets.push(toast);
      }
    }

    const events: ToastEvent<Content>[] = [];
    for (const toast of targets) {
      const event = applyOne(toast);
      if (event !== null) {
        events.push(event);
      }
    }

    this.#commit(...events);
  }

  #startExpiry(toast: Toast<Content>): void {
    const key = toast.key;
    // Every active toast keeps a timer entry, Infinity included, so
    // remaining() answers lifetime questions uniformly. A paused toast
    // starts frozen (start, then pause): the entry holds the full
    // remainder for the resume that unfreezes it.
    this.#expiryTimers.start(key, toast.entry.duration, () =>
      this.dismiss(key)
    );
    if (toast.paused) {
      this.#expiryTimers.pause(key);
    }
  }

  #hasFreeSlot(): boolean {
    return this.#store.count((t) => t.phase === 'active') < this.config.max;
  }

  /**
   * The only publication point. Promotion lands in the same batch as its
   * cause: while a slot is free and a queued toast exists, the oldest
   * one activates (frozen if it was paused).
   */
  #commit(...events: ToastEvent<Content>[]): void {
    if (events.length === 0) {
      return;
    }

    while (this.#hasFreeSlot()) {
      const queued = this.#store.select((t) => t.phase === 'queued')[0];
      if (queued === undefined) {
        break;
      }

      const active: Toast<Content> = { ...queued, phase: 'active' };
      this.#store.set(active);
      this.#startExpiry(active);
      events.push({ type: 'updated', toast: active, prev: queued });
    }

    this.#store.commit(...events);
  }
}

function createPresenter<Content extends {} = string>(
  toaster: Toaster<Content>,
  config?: PresenterConfig
): PresenterContract<Content> {
  return new Presenter(toaster, config);
}

export { createPresenter };
