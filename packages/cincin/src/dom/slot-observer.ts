import { Subscribable } from '../shared/subscribable';
import type { StackLayout, StackSlot } from './stack-layout';
import type { ToastKey } from '../presenter';

type SlotObserverOptions = {
  key: ToastKey;
};

/**
 * A per-card lens over the layout: no state of its own, no claim on the
 * composition (that stays with `setEntries`). It can outlive its slot
 * (the snapshot turns `undefined`) and be born before it; StrictMode
 * replays of `observe` are free because measurements live in the layout
 * keyed by data. The upstream subscription is lazy: the layout is
 * listened to only while someone listens to the observer. Snapshots
 * need no cache here: the layout keeps slot references stable and
 * publishes only real changes. The options are immutable: a stateless
 * lens costs nothing to recreate, so switching keys is a new observer,
 * not a mutation.
 */
class SlotObserver extends Subscribable<(slot: StackSlot | undefined) => void> {
  readonly #layout: StackLayout;
  readonly #options: SlotObserverOptions;
  #detach: (() => void) | undefined;

  constructor(layout: StackLayout, options: SlotObserverOptions) {
    super();

    this.#layout = layout;
    this.#options = options;

    this.observe = this.observe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
  }

  /** Registers the card's element for measurement (sugar over
   * `layout.setCard`); the return detaches it. */
  observe(element: HTMLElement): () => void {
    const { key } = this.#options;
    this.#layout.setCard(key, element);

    return () => this.#layout.setCard(key, null);
  }

  getSnapshot(): StackSlot | undefined {
    return this.#layout.getSlot(this.#options.key);
  }

  protected override onSubscribe(): void {
    if (this.#detach !== undefined) {
      this.#detach();
    }

    this.#detach = this.#layout.subscribe((event) => {
      if (event.key !== this.#options.key) {
        return;
      }

      this.notify([[event.slot]]);
    });
  }

  protected override onUnsubscribe(): void {
    if (!this.hasListeners()) {
      this.#detach?.();
      this.#detach = undefined;
    }
  }
}

function createSlotObserver(
  layout: StackLayout,
  options: SlotObserverOptions
): SlotObserver {
  return new SlotObserver(layout, options);
}

export { createSlotObserver };
export type { SlotObserver, SlotObserverOptions };
