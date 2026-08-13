import { ToastStore } from './store';
import { TimerManager } from './timer-manager';
import { counter, devWarn } from './utils';
import type {
  CreateOptions,
  UpdatePatch,
  PromisePhase,
  Toast,
  Toaster as ToasterContract,
  ToasterConfig,
  ToastId,
  ToastNotifyEvent,
  DismissedNotifyEvent,
  RemovedNotifyEvent,
  UpdatedNotifyEvent,
  ToastType,
} from './types';

class Toaster<Content extends {} = string> implements ToasterContract<Content> {
  readonly config: Readonly<Required<ToasterConfig>>;

  #store = new ToastStore<Content>();
  #durationTimers = new TimerManager<ToastId>();
  #removeTimers = new TimerManager<ToastId>();
  #toastCounter = counter();

  // Delegates are pre-bound by their owners (Subscribable/ToastStore constructors).
  readonly subscribe: ToasterContract<Content>['subscribe'];
  readonly getSnapshot: ToasterContract<Content>['getSnapshot'];

  constructor(config?: ToasterConfig) {
    this.config = {
      max: config?.max ?? Infinity,
      duration: config?.duration ?? 4000,
      removeTimeout: config?.removeTimeout ?? 2000,
    };

    this.subscribe = this.#store.subscribe;
    this.getSnapshot = this.#store.getSnapshot;

    this.success = this.success.bind(this);
    this.error = this.error.bind(this);
    this.warning = this.warning.bind(this);
    this.info = this.info.bind(this);
    this.loading = this.loading.bind(this);
    this.message = this.message.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.dismiss = this.dismiss.bind(this);
    this.remove = this.remove.bind(this);
    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.promise = this.promise.bind(this);
    this.getRemainingMs = this.getRemainingMs.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  success(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId {
    return this.create(content, { ...options, type: 'success' });
  }

  error(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId {
    return this.create(content, { ...options, type: 'error' });
  }

  warning(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId {
    return this.create(content, { ...options, type: 'warning' });
  }

  info(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId {
    return this.create(content, { ...options, type: 'info' });
  }

  loading(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId {
    return this.create(content, { ...options, type: 'loading' });
  }

  message(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId {
    return this.create(content, { ...options, type: 'message' });
  }

  create(content: Content, options: CreateOptions = {}): ToastId {
    const { id, type, duration, dismissible = true } = options;
    const toastId = this.#resolveToastId(id);

    const existing = this.#store.get(toastId);

    if (existing !== undefined && existing.status !== 'dismissing') {
      // Upsert: only explicitly provided fields make it into the patch.
      this.update(toastId, {
        content,
        ...(type !== undefined && { type }),
        ...(duration !== undefined && { duration }),
      });

      return toastId;
    }

    if (existing !== undefined) {
      // Dead means dead: a dismissing toast is on its way out. Bury it now
      // and fall through to a fresh create under the same id, so the caller
      // gets a live toast instead of patching a corpse the safety net is
      // about to delete. The renderer sees familiar removed + added events.
      this.remove(toastId);
    }

    const toastType = type ?? 'message';
    const toast: Toast<Content> = {
      id: toastId,
      content,
      status: this.#hasFreeSlot() ? 'active' : 'queued',
      type: toastType,
      duration: this.#resolveToastDuration(toastType, duration),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dismissible,
      paused: false,
    };

    this.#store.set(toast);
    if (toast.status === 'active') {
      this.#startDuration(toast);
    }
    this.#commit({ type: 'added', toast });

    return toastId;
  }

  update(id: ToastId, patch: UpdatePatch<Content>): void {
    const prev = this.#store.get(id);
    if (prev === undefined) {
      devWarn('update: toast not found', id);
      return;
    }

    const type = patch.type ?? prev.type;
    const typeChanged = type !== prev.type;
    // Inheriting the previous duration is only valid while the type is unchanged.
    const duration =
      patch.duration ??
      (typeChanged ? this.#resolveToastDuration(type) : prev.duration);
    // The timer belongs to the duration: touching it explicitly (even with the
    // same value) or implicitly via a type change rewinds the clock. A repeated
    // notification can extend its toast this way; content-only updates never do.
    const shouldRestartTimer = patch.duration !== undefined || typeChanged;

    const next: Toast<Content> = {
      ...prev,
      ...patch,
      type,
      duration,
      updatedAt: Date.now(),
    };

    this.#store.set(next);
    if (shouldRestartTimer && next.status === 'active') {
      this.#startDuration(next);
    }
    this.#commit({ type: 'updated', toast: next, previous: prev });
  }

  dismiss(): void;
  dismiss(id: ToastId): void;
  dismiss(ids: ToastId[]): void;
  dismiss(target?: ToastId | ToastId[]): void {
    this.#command('dismiss', arguments.length, target, (toast) =>
      this.#dismissOne(toast)
    );
  }

  remove(): void;
  remove(id: ToastId): void;
  remove(ids: ToastId[]): void;
  remove(target?: ToastId | ToastId[]): void {
    this.#command('remove', arguments.length, target, (toast) =>
      this.#removeOne(toast)
    );
  }

  pause(): void;
  pause(id: ToastId): void;
  pause(ids: ToastId[]): void;
  pause(target?: ToastId | ToastId[]): void {
    this.#command('pause', arguments.length, target, (toast) =>
      this.#pauseOne(toast)
    );
  }

  resume(): void;
  resume(id: ToastId): void;
  resume(ids: ToastId[]): void;
  resume(target?: ToastId | ToastId[]): void {
    this.#command('resume', arguments.length, target, (toast) =>
      this.#resumeOne(toast)
    );
  }

  promise<T>(
    promise: Promise<T>,
    phases: PromisePhase<T, Content>
  ): Promise<T> {
    const id = this.loading(phases.loading);

    promise
      .then(
        (value) =>
          // A failing success factory falls through to the error phase,
          // carrying its failure as the error input.
          this.#applyPhase(id, 'success', phases.success, value).catch(
            (error) => this.#applyPhase(id, 'error', phases.error, error)
          ),
        (reason) => this.#applyPhase(id, 'error', phases.error, reason)
      )
      .catch((error) => {
        // Even the error phase factory failed: give up loudly (dev) but gracefully.
        devWarn('promise: error phase factory failed', error);
        if (this.#canSettle(id)) {
          this.dismiss(id);
        }
      });

    // Strict mirror of the original promise: factory failures never leak into it.
    return promise;
  }

  /** Applies a settled promise phase to the loading toast. */
  async #applyPhase(
    id: ToastId,
    type: 'success' | 'error',
    // (input: never) is the common supertype of both phase factory shapes.
    phase: Content | ((input: never) => Content | Promise<Content>) | undefined,
    input: unknown
  ): Promise<void> {
    // The user may have dismissed the toast while the promise was pending.
    if (!this.#canSettle(id)) {
      return;
    }

    if (phase === undefined) {
      // An omitted phase means "nothing to show": the toast just leaves.
      this.dismiss(id);
      return;
    }

    const content = await this.#resolvePhaseContent(phase, input);

    // Re-check after the await: the factory could be slow, the user faster.
    if (!this.#canSettle(id)) {
      return;
    }

    // Type change brings the type default duration and restarts the clock.
    this.update(id, { type, content });
  }

  /** A toast can settle while it is still visible and not on its way out. */
  #canSettle(id: ToastId): boolean {
    const toast = this.#store.get(id);
    return toast !== undefined && toast.status !== 'dismissing';
  }

  /** The only place where the core branches on a phase value shape. */
  async #resolvePhaseContent(
    phase: Content | ((input: never) => Content | Promise<Content>),
    input: unknown
  ): Promise<Content> {
    if (typeof phase === 'function') {
      // Known limitation, documented: a Content that is itself a function
      // must be wrapped in a factory when used as a promise phase.
      return await (phase as (input: unknown) => Content | Promise<Content>)(
        input
      );
    }

    return phase;
  }

  getRemainingMs(id: ToastId): number {
    const toast = this.#store.get(id);
    if (toast !== undefined && toast.status === 'queued') {
      // Life has not started yet: the full duration is still ahead.
      return toast.duration;
    }

    return this.#durationTimers.remaining(id);
  }

  destroy(): void {
    this.#durationTimers.clear();
    this.#removeTimers.clear();
    this.#store.clearListeners();
  }

  // --- planners: mutate the store, return an event or null, never commit ---

  #dismissOne(toast: Toast<Content>): DismissedNotifyEvent<Content> | null {
    if (toast.status === 'dismissing') {
      return null;
    }

    this.#durationTimers.cancel(toast.id);

    const next: Toast<Content> = {
      ...toast,
      status: 'dismissing',
      updatedAt: Date.now(),
    };
    this.#store.set(next);
    // Safety net: if the renderer never calls remove(), we do.
    this.#removeTimers.start(next.id, this.config.removeTimeout, () =>
      this.remove(next.id)
    );

    return { type: 'dismissed', toast: next };
  }

  #removeOne(toast: Toast<Content>): RemovedNotifyEvent<Content> | null {
    this.#removeTimers.cancel(toast.id);
    this.#durationTimers.cancel(toast.id);

    if (!this.#store.delete(toast.id)) {
      return null;
    }

    return { type: 'removed', toast };
  }

  #pauseOne(toast: Toast<Content>): UpdatedNotifyEvent<Content> | null {
    // Pause targets active toasts only: queued has no timer yet,
    // dismissing must keep its safety net ticking.
    if (toast.status !== 'active' || toast.paused) {
      return null;
    }

    this.#durationTimers.pause(toast.id);

    const next: Toast<Content> = {
      ...toast,
      paused: true,
      updatedAt: Date.now(),
    };
    this.#store.set(next);

    return { type: 'updated', toast: next, previous: toast };
  }

  #resumeOne(toast: Toast<Content>): UpdatedNotifyEvent<Content> | null {
    if (!toast.paused) {
      return null;
    }

    this.#durationTimers.resume(toast.id);

    const next: Toast<Content> = {
      ...toast,
      paused: false,
      updatedAt: Date.now(),
    };
    this.#store.set(next);

    return { type: 'updated', toast: next, previous: toast };
  }

  #command(
    name: string,
    arity: number,
    target: ToastId | ToastId[] | undefined,
    applyOne: (toast: Toast<Content>) => ToastNotifyEvent<Content> | null
  ): void {
    if (arity > 0 && target === undefined) {
      devWarn(`${name}: called with undefined id, did you mean ${name}()?`);
      return;
    }

    const events: ToastNotifyEvent<Content>[] = [];
    for (const toast of this.#resolveTargets(name, target)) {
      const event = applyOne(toast);
      if (event !== null) {
        events.push(event);
      }
    }

    this.#commit(...events);
  }

  #resolveTargets(
    name: string,
    target: ToastId | ToastId[] | undefined
  ): Toast<Content>[] {
    if (target === undefined) {
      return this.#store.values();
    }

    const ids = Array.isArray(target) ? target : [target];
    const found: Toast<Content>[] = [];

    for (const id of ids) {
      const toast = this.#store.get(id);
      if (toast === undefined) {
        devWarn(`${name}: toast not found`, id);
        continue;
      }
      found.push(toast);
    }

    return found;
  }

  // --- publication ---

  /**
   * The only publication point of the facade. Replays the queue invariant
   * (count(active) <= max) so promotions land in the same batch as their cause.
   * Convention guarded by CI grep: `store.commit` has exactly one call site.
   */
  #commit(...events: ToastNotifyEvent<Content>[]): void {
    if (events.length === 0) {
      // No mutations means no freed slots: nothing to promote, nothing to publish.
      return;
    }

    while (this.#hasFreeSlot()) {
      const nextQueued = this.#store
        .values()
        .find((toast) => toast.status === 'queued');

      if (nextQueued === undefined) {
        break;
      }

      const activated = this.#activate(nextQueued);
      events.push({ type: 'updated', toast: activated, previous: nextQueued });
    }

    this.#store.commit(...events);
  }

  #hasFreeSlot(): boolean {
    return (
      this.#store.count((toast) => toast.status === 'active') < this.config.max
    );
  }

  /** The single definition of what becoming active means. */
  #activate(toast: Toast<Content>): Toast<Content> {
    const next: Toast<Content> = {
      ...toast,
      status: 'active',
      updatedAt: Date.now(),
    };

    this.#store.set(next);
    this.#startDuration(next);

    return next;
  }

  #startDuration(toast: Toast<Content>): void {
    // Expiry goes through the public command: no second path to death.
    this.#durationTimers.start(toast.id, toast.duration, () =>
      this.dismiss(toast.id)
    );

    if (toast.paused) {
      this.#durationTimers.pause(toast.id);
    }
  }

  // --- resolution helpers ---

  #resolveToastId(initial?: ToastId): ToastId {
    if (initial === undefined) {
      return this.#createToastId();
    }

    if (typeof initial === 'number') {
      return initial;
    }

    if (initial.length > 0) {
      return initial;
    }

    devWarn('create: empty string id, generating one instead');
    return this.#createToastId();
  }

  #createToastId(): Extract<ToastId, string> {
    return `t-${this.#toastCounter()}`;
  }

  #resolveToastDuration(type: ToastType, duration?: number): number {
    if (typeof duration === 'number') {
      return duration;
    }

    if (type === 'loading') {
      return Infinity;
    }

    return this.config.duration;
  }
}

function createToaster<Content extends {} = string>(
  config?: ToasterConfig
): ToasterContract<Content> {
  return new Toaster(config);
}

export { createToaster };
