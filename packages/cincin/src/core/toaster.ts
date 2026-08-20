import { createToastStore } from './store';
import { counter, devWarn } from '../shared/utils';
import type {
  CreateOptions,
  UpdatePatch,
  PromisePhase,
  PromiseOptions,
  ToastEntry,
  Toaster as ToasterContract,
  ToasterConfig,
  ToastId,
  ToastEntryEvent,
  ToastType,
} from './types';

/**
 * The notification record store with its sugar. It knows nothing about
 * showing: queueing, timers, pauses and exit phases belong to a presenter
 * subscribed to it. The only lifecycle here is create, update, remove.
 */
class Toaster<Content extends {} = string> implements ToasterContract<Content> {
  readonly config: Readonly<Required<ToasterConfig>>;

  #store = createToastStore<Content>();
  #toastCounter = counter();
  #idSalt = Math.random().toString(36).slice(2, 6);

  // Delegates are pre-bound by their owners (Subscribable/ToastStore constructors).
  readonly subscribe: ToasterContract<Content>['subscribe'];
  readonly getSnapshot: ToasterContract<Content>['getSnapshot'];

  constructor(config?: ToasterConfig) {
    this.config = Object.freeze({
      duration: config?.duration ?? 4000,
    });

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
    this.remove = this.remove.bind(this);
    this.promise = this.promise.bind(this);
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
    // No destructuring defaults here: the upsert path must still see the
    // difference between an omitted option and an explicitly provided one.
    const { id, type, duration, dismissible } = options;
    const toastId = this.#resolveToastId(id);

    if (this.#store.has(toastId)) {
      // Upsert: only explicitly provided fields make it into the patch.
      // Whether the record is currently leaving a screen is the presenter's
      // concern (it opens a fresh presentation for an update on a leaving
      // one); the store just patches the record.
      this.update(toastId, {
        content,
        ...(type !== undefined && { type }),
        ...(duration !== undefined && { duration }),
        ...(dismissible !== undefined && { dismissible }),
      });

      return toastId;
    }

    const toastType = type ?? 'message';
    const entry: ToastEntry<Content> = {
      id: toastId,
      content,
      type: toastType,
      duration: this.#resolveToastDuration(toastType, duration),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dismissible: this.#resolveDismissible(toastType, dismissible),
    };

    this.#store.set(entry);
    this.#store.commit({ type: 'added', entry });

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
    // Same rule for dismissibility: it derives from the type unless set
    // explicitly, so a settled promise becomes closable again. Restarting
    // the expiry clock on a duration touch is the presenter's rule; it reads
    // the previous record off the updated event.
    const dismissible =
      patch.dismissible ??
      (typeChanged ? this.#resolveDismissible(type) : prev.dismissible);

    const next: ToastEntry<Content> = {
      ...prev,
      ...patch,
      type,
      duration,
      dismissible,
      updatedAt: Date.now(),
    };

    this.#store.set(next);
    this.#store.commit({ type: 'updated', entry: next, prev, patch });
  }

  remove(): void;
  remove(id: ToastId): void;
  remove(ids: ToastId[]): void;
  remove(target?: ToastId | ToastId[]): void {
    if (arguments.length > 0 && target === undefined) {
      devWarn('remove: called with undefined id, did you mean remove()?');
      return;
    }

    const ids = new Set(
      target === undefined
        ? this.#store.values().map((entry) => entry.id)
        : Array.isArray(target)
          ? target
          : [target]
    );

    const events: ToastEntryEvent<Content>[] = [];
    for (const id of ids) {
      const entry = this.#store.get(id);
      // A remove on a gone record is routine (a presenter finishing a ghost
      // whose record already left): no warning, no event.
      if (entry === undefined) continue;

      this.#store.delete(id);
      events.push({ type: 'removed', entry });
    }

    // One batch, one snapshot swap.
    this.#store.commit(...events);
  }

  promise<T>(
    promise: Promise<T>,
    phases: PromisePhase<T, Content>,
    options?: PromiseOptions
  ): Promise<T> {
    // The options only shape the pending toast: create handles id
    // addressing (upsert included) and the dismissible override.
    const id = this.loading(phases.loading, options);

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
        if (this.#store.has(id)) {
          this.remove(id);
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
    // The record may have been removed while the promise was pending: a
    // settle on a gone record is dropped.
    if (!this.#store.has(id)) {
      return;
    }

    if (phase === undefined) {
      // An omitted phase means "nothing to show": the toast just goes.
      this.remove(id);
      return;
    }

    const content = await this.#resolvePhaseContent(phase, input);

    // Re-check after the await: the factory could be slow, the user faster.
    if (!this.#store.has(id)) {
      return;
    }

    // A type change re-derives duration and dismissibility from the type.
    this.update(id, { type, content });
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

  destroy(): void {
    if (this.#store.hasListeners()) {
      devWarn('destroy: the toaster still has subscribers');
    }
    this.#store.clearListeners();
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
    // The per-instance salt keeps generated ids out of any user id namespace:
    // an accidental collision would require guessing both format and salt.
    // The counter stays for readability and creation order in devtools.
    return `t-${this.#idSalt}-${this.#toastCounter()}`;
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

  #resolveDismissible(type: ToastType, dismissible?: boolean): boolean {
    if (typeof dismissible === 'boolean') {
      return dismissible;
    }

    // A running operation has an unknown outcome: the user cannot close
    // it, only the code that started it can (remove still works, the
    // flag only steers user-facing controls).
    return type !== 'loading';
  }
}

function createToaster<Content extends {} = string>(
  config?: ToasterConfig
): ToasterContract<Content> {
  return new Toaster(config);
}

export { createToaster };
