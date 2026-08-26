class Subscribable<TListener extends (...args: any[]) => void> {
  protected listeners = new Set<TListener>();

  constructor() {
    this.subscribe = this.subscribe.bind(this);
  }

  subscribe(listener: TListener): () => void {
    this.listeners.add(listener);

    this.onSubscribe();

    return () => {
      this.listeners.delete(listener);
      this.onUnsubscribe();
    };
  }

  hasListeners(): boolean {
    return this.listeners.size > 0;
  }

  clearListeners(): void {
    this.listeners.clear();
  }

  /** The notification half of the commit protocol: state first, then
   * the collected calls, delivered to a snapshot of the listeners.
   * A listener unsubscribed mid-notify is skipped, one subscribed
   * mid-notify waits for the next, and a throwing one surfaces its
   * error without starving the rest. */
  protected notify(calls: ReadonlyArray<Parameters<TListener>>): void {
    if (calls.length === 0) {
      return;
    }

    const current = Array.from(this.listeners);

    for (const args of calls) {
      for (const listener of current) {
        if (!this.listeners.has(listener)) {
          continue;
        }

        try {
          listener(...args);
        } catch (error) {
          setTimeout(() => {
            throw error;
          }, 0);
        }
      }
    }
  }

  protected onSubscribe(): void {
    // Do nothing
  }

  protected onUnsubscribe(): void {
    // Do nothing
  }
}

export { Subscribable };
