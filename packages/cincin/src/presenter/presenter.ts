import { TimerManager } from './timer-manager';
import { Mountable } from '../shared/mountable';
import { counter, devWarn } from '../shared/utils';
import { createPresentationStore } from './store';
import type { Toast, Toaster, ToastId, UpdatePatch } from '../core/types';
import type {
  EnteredEvent,
  LeavingEvent,
  Presentation,
  PresentationKey,
  Presenter as PresenterContract,
  PresenterConfig,
  PresenterEvent,
  UpdatedEvent,
} from './types';

/**
 * Shows a toaster's records: one presentation per showing, with a queue
 * (max), an expiry clock per presentation, pauses, and an exit phase the
 * renderer finishes. Presentations reference the records and outlive
 * them as ghosts: a leaving presentation keeps the last record it saw.
 * Several presenters over one toaster are the consumer's coordination;
 * this one removes a record once none of its presentations remain here.
 */
class Presenter<ToastContent extends {} = string>
  extends Mountable
  implements PresenterContract<ToastContent>
{
  readonly config: Readonly<Required<PresenterConfig>>;

  // Delegates are pre-bound by their owners.
  readonly subscribe: PresenterContract<ToastContent>['subscribe'];
  readonly getSnapshot: PresenterContract<ToastContent>['getSnapshot'];

  #toaster: Toaster<ToastContent>;
  #store = createPresentationStore<ToastContent>();
  #expiryTimers = new TimerManager<PresentationKey>();
  #leaveTimers = new TimerManager<PresentationKey>();

  #unsubscribe: (() => void) | undefined;
  #keyCounter = counter();
  #keySalt = Math.random().toString(36).slice(2, 6);

  constructor(toaster: Toaster<ToastContent>, config: PresenterConfig = {}) {
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
    // Records that already exist enter now, in one batch: a presenter
    // mounted after toasts were added still shows them.
    this.#commit(...this.#toaster.getSnapshot().map((t) => this.#enter(t)));

    this.#unsubscribe = this.#toaster.subscribe((event) => {
      switch (event.type) {
        case 'added':
          this.#commit(this.#enter(event.toast));
          return;

        case 'updated':
          this.#commit(
            ...this.#refresh(event.toast, event.previous, event.patch)
          );
          return;

        case 'removed':
          this.#commit(...this.#orphan(event.toast.id));
          return;
      }
    });
  }

  protected override onUnmount(): void {
    // No region, nothing to animate: every presentation leaves at once,
    // clocks stop, the record store is untouched.
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#expiryTimers.clear();
    this.#leaveTimers.clear();

    const gone = this.#store.values();
    for (const presentation of gone) {
      this.#store.delete(presentation.key);
    }

    this.#store.commit(
      ...gone.map((presentation) => ({ type: 'left' as const, presentation }))
    );
  }

  // --- planners: mutate the store, return events, never commit ---

  #enter(toast: Toast<ToastContent>): EnteredEvent<ToastContent> {
    const presentation: Presentation<ToastContent> = {
      key: `p-${this.#keySalt}-${this.#keyCounter()}`,
      toast,
      phase: this.#hasFreeSlot() ? 'active' : 'queued',
      paused: false,
    };

    this.#store.set(presentation);
    if (presentation.phase === 'active') {
      this.#startExpiry(presentation);
    }

    return { type: 'entered', presentation };
  }

  #refresh(
    toast: Toast<ToastContent>,
    previous: Toast<ToastContent>,
    patch: UpdatePatch<ToastContent>
  ): PresenterEvent<ToastContent>[] {
    const live = this.#store.select(
      (p) => p.toast.id === toast.id && p.phase !== 'leaving'
    );

    if (live.length === 0) {
      // Dead means dead: every presentation of this record is leaving; the
      // updated record gets a fresh one while the ghosts play out.
      return [this.#enter(toast)];
    }

    // The clock belongs to the duration: an explicit touch (even with the
    // same value) or a type change rewinds it; content-only updates never do.
    const restart =
      patch.duration !== undefined || toast.type !== previous.type;

    return live.map((presentation) => {
      const next: Presentation<ToastContent> = { ...presentation, toast };
      this.#store.set(next);
      if (restart && next.phase === 'active') {
        this.#startExpiry(next);
      }

      return { type: 'updated', presentation: next, previous: presentation };
    });
  }

  #orphan(id: ToastId): PresenterEvent<ToastContent>[] {
    // The record is gone: live presentations start leaving (as ghosts of
    // the last record they saw), ones already leaving are untouched.
    return this.#store
      .select((p) => p.toast.id === id && p.phase !== 'leaving')
      .map((presentation) => this.#leave(presentation));
  }

  #leave(presentation: Presentation<ToastContent>): LeavingEvent<ToastContent> {
    this.#expiryTimers.cancel(presentation.key);

    const next: Presentation<ToastContent> = {
      ...presentation,
      phase: 'leaving',
    };
    this.#store.set(next);

    // Safety net: if nobody finishes the exit, we do. Capture only the key.
    const key = next.key;
    this.#leaveTimers.start(key, this.config.removeTimeout, () =>
      this.finish(key)
    );

    return { type: 'leaving', presentation: next };
  }

  #pauseOne(
    presentation: Presentation<ToastContent>
  ): UpdatedEvent<ToastContent> | null {
    // Active and queued pause (a paused queued one gets promoted frozen);
    // leaving is excluded: the safety net must keep ticking.
    if (presentation.phase === 'leaving' || presentation.paused) {
      return null;
    }

    this.#expiryTimers.pause(presentation.key);
    const next: Presentation<ToastContent> = { ...presentation, paused: true };
    this.#store.set(next);

    return { type: 'updated', presentation: next, previous: presentation };
  }

  #resumeOne(
    presentation: Presentation<ToastContent>
  ): UpdatedEvent<ToastContent> | null {
    if (!presentation.paused) {
      return null;
    }

    this.#expiryTimers.resume(presentation.key);
    const next: Presentation<ToastContent> = { ...presentation, paused: false };
    this.#store.set(next);

    return { type: 'updated', presentation: next, previous: presentation };
  }

  // --- commands ---

  dismiss(): void;
  dismiss(key: PresentationKey): void;
  dismiss(keys: PresentationKey[]): void;
  dismiss(target?: PresentationKey | PresentationKey[]): void {
    this.#command('dismiss', arguments.length, target, (presentation) =>
      presentation.phase === 'leaving' ? null : this.#leave(presentation)
    );
  }

  pause(): void;
  pause(key: PresentationKey): void;
  pause(keys: PresentationKey[]): void;
  pause(target?: PresentationKey | PresentationKey[]): void {
    this.#command('pause', arguments.length, target, (presentation) =>
      this.#pauseOne(presentation)
    );
  }

  resume(): void;
  resume(key: PresentationKey): void;
  resume(keys: PresentationKey[]): void;
  resume(target?: PresentationKey | PresentationKey[]): void {
    this.#command('resume', arguments.length, target, (presentation) =>
      this.#resumeOne(presentation)
    );
  }

  /** The renderer finished the exit (or the safety net did). */
  finish(key: PresentationKey): void {
    const presentation = this.#store.get(key);
    if (presentation === undefined) {
      // A finish on a gone key is routine (safety net racing the renderer).
      return;
    }

    this.#leaveTimers.cancel(key);
    this.#expiryTimers.cancel(key);
    this.#store.delete(key);
    // Publish `left` before touching the toaster: its `removed` comes back
    // through #orphan and must find this presentation already gone.
    this.#commit({ type: 'left', presentation });

    // The presenter owns removal: once no presentation of the record remains
    // here, the record goes. A remove on an already-gone record is a no-op.
    const id = presentation.toast.id;
    if (this.#store.count((p) => p.toast.id === id) === 0) {
      this.#toaster.remove(id);
    }
  }

  getRemainingMs(key: PresentationKey): number {
    const presentation = this.#store.get(key);
    if (presentation === undefined || presentation.phase === 'leaving') {
      return 0;
    }

    if (presentation.phase === 'queued') {
      // Life has not started yet: the full duration is still ahead.
      return presentation.toast.duration;
    }

    return this.#expiryTimers.remaining(key);
  }

  // --- internals ---

  #command(
    name: string,
    arity: number,
    target: PresentationKey | PresentationKey[] | undefined,
    applyOne: (
      presentation: Presentation<ToastContent>
    ) => PresenterEvent<ToastContent> | null
  ): void {
    if (arity > 0 && target === undefined) {
      devWarn(
        `presenter.${name}: called with undefined key, did you mean ${name}()?`
      );
      return;
    }

    const targets: Presentation<ToastContent>[] = [];
    if (target === undefined) {
      targets.push(...this.#store.values());
    } else {
      for (const key of new Set(Array.isArray(target) ? target : [target])) {
        const presentation = this.#store.get(key);
        if (presentation === undefined) {
          devWarn(`presenter.${name}: presentation not found`, key);
          continue;
        }
        targets.push(presentation);
      }
    }

    const events: PresenterEvent<ToastContent>[] = [];
    for (const presentation of targets) {
      const event = applyOne(presentation);
      if (event !== null) {
        events.push(event);
      }
    }

    this.#commit(...events);
  }

  #startExpiry(presentation: Presentation<ToastContent>): void {
    if (presentation.toast.duration === Infinity || presentation.paused) {
      return;
    }

    const key = presentation.key;
    this.#expiryTimers.start(key, presentation.toast.duration, () =>
      this.dismiss(key)
    );
  }

  #hasFreeSlot(): boolean {
    return this.#store.count((p) => p.phase === 'active') < this.config.max;
  }

  /**
   * The only publication point. Promotion lands in the same batch as its
   * cause: while a slot is free and a queued presentation exists, the
   * oldest one activates (frozen if it was paused).
   */
  #commit(...events: PresenterEvent<ToastContent>[]): void {
    if (events.length === 0) {
      return;
    }

    while (this.#hasFreeSlot()) {
      const queued = this.#store.select((p) => p.phase === 'queued')[0];
      if (queued === undefined) {
        break;
      }

      const active: Presentation<ToastContent> = { ...queued, phase: 'active' };
      this.#store.set(active);
      this.#startExpiry(active);
      events.push({ type: 'updated', presentation: active, previous: queued });
    }

    this.#store.commit(...events);
  }
}

function createPresenter<ToastContent extends {} = string>(
  toaster: Toaster<ToastContent>,
  config?: PresenterConfig
): PresenterContract<ToastContent> {
  return new Presenter(toaster, config);
}

export { createPresenter };
