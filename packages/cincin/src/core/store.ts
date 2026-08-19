import { Subscribable } from '../shared/subscribable';
import type { ToastId, Toast, ToastNotifyEvent } from './types';

class ToastStore<Content extends {} = string> extends Subscribable<
  (event: ToastNotifyEvent<Content>) => void
> {
  #toasts = new Map<ToastId, Toast<Content>>();
  #snapshot: ReadonlyArray<Toast<Content>> = [];

  constructor() {
    super();
    this.getSnapshot = this.getSnapshot.bind(this);
  }

  get(id: ToastId): Toast<Content> | undefined {
    return this.#toasts.get(id);
  }

  has(id: ToastId): boolean {
    return this.#toasts.has(id);
  }

  values(): Toast<Content>[] {
    return Array.from(this.#toasts.values());
  }

  count(predicate?: (toast: Toast<Content>) => boolean): number {
    if (predicate === undefined) {
      return this.#toasts.size;
    }

    return Array.from(this.#toasts.values()).filter(predicate).length;
  }

  set(toast: Toast<Content>): void {
    this.#toasts.set(toast.id, toast);
  }

  delete(id: ToastId): boolean {
    return this.#toasts.delete(id);
  }

  commit(...events: ToastNotifyEvent<Content>[]): void {
    if (events.length === 0) {
      return;
    }

    this.#snapshot = Object.freeze(this.values());

    const current = Array.from(this.listeners);

    for (const event of events) {
      for (const listener of current) {
        if (!this.listeners.has(listener)) {
          continue;
        }

        try {
          listener(event);
        } catch (error) {
          setTimeout(() => {
            throw error;
          }, 0);
        }
      }
    }
  }

  getSnapshot(): ReadonlyArray<Toast<Content>> {
    return this.#snapshot;
  }
}

export { ToastStore };
