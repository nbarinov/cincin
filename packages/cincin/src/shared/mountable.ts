class Mountable {
  #mountCount = 0;

  constructor() {
    this.mount = this.mount.bind(this);
    this.unmount = this.unmount.bind(this);
  }

  mount() {
    this.#mountCount++;

    if (this.#mountCount === 1) {
      this.onMount();
    }
  }

  unmount() {
    if (this.#mountCount === 0) return;

    this.#mountCount = Math.max(0, this.#mountCount - 1);

    if (this.#mountCount === 0) {
      this.onUnmount();
    }
  }

  protected get isMounted() {
    return this.#mountCount > 0;
  }

  protected onMount() {
    // Do nothing
  }

  protected onUnmount() {
    // Do nothing
  }
}

export { Mountable };
