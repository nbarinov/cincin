class Subscribable {
  protected listeners = new Set<() => void>();

  constructor() {
    this.subscribe = this.subscribe.bind(this);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.onSubscribe();

    return () => {
      this.listeners.delete(listener);
      this.onUnsubscribe();
    };
  }

  protected notify(): void {
    for (const listener of Array.from(this.listeners)) {
      listener();
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
