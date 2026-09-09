import type {
  PresenterHolder as PresenterHolderContract,
  Presenter,
  ToastKey,
} from './types';

/**
 * The one holder of a presenter's clocks.
 */
class PresenterHolder implements PresenterHolderContract {
  readonly #presenter: Presenter<{}>;
  readonly #names = new Set<string | symbol>();
  readonly #frozen = new Set<ToastKey>();
  #unsubscribe: (() => void) | undefined;

  constructor(presenter: Presenter<{}>) {
    this.#presenter = presenter;

    this.hold = this.hold.bind(this);
    this.release = this.release.bind(this);
    this.held = this.held.bind(this);
  }

  hold(name: string | symbol): () => void {
    if (!this.#names.has(name)) {
      this.#names.add(name);

      if (this.#names.size === 1) {
        this.#engage();
      }
    }

    return () => this.release(name);
  }

  release(name: string | symbol): void {
    const isDeleted = this.#names.delete(name);
    if (isDeleted && this.#names.size === 0) {
      this.#disengage();
    }
  }

  held(): boolean {
    return this.#names.size > 0;
  }

  #engage(): void {
    this.#freeze(
      this.#presenter
        .getSnapshot()
        .filter((toast) => toast.phase !== 'leaving' && !toast.paused)
        .map((toast) => toast.key)
    );

    this.#unsubscribe = this.#presenter.subscribe((event) => {
      if (event.type === 'entered') {
        this.#freeze([event.toast.key]);
      } else if (event.type === 'left') {
        this.#frozen.delete(event.toast.key);
      }
    });
  }

  #disengage(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;

    const keys = [...this.#frozen];
    this.#frozen.clear();

    if (keys.length > 0) {
      this.#presenter.resume(keys);
    }
  }

  #freeze(keys: ReadonlyArray<ToastKey>): void {
    if (keys.length === 0) {
      return;
    }

    for (const key of keys) {
      this.#frozen.add(key);
    }

    this.#presenter.pause([...keys]);
  }
}

function createPresenterHolder(
  presenter: Presenter<{}>
): PresenterHolderContract {
  return new PresenterHolder(presenter);
}

export { createPresenterHolder };
