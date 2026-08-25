import type { ToastKey } from '../presenter';

/** One rendered card, as the renderer sees it. The layout deliberately
 * speaks its own minimal vocabulary instead of the presenter's phases:
 * `entries` mirrors what is actually in the DOM, and the only lifecycle
 * fact geometry cares about is "this card is exiting". */
type StackLayoutEntry = {
  key: ToastKey;
  /** The card is exiting: its slot and height variables freeze, and it
   * vacates its slot for the survivors. */
  leaving: boolean;
};

type StackLayoutOrder = 'stack' | 'queue';

type StackLayoutConfig = {
  /** Which end of `entries` is the front card. @default 'stack' */
  order?: StackLayoutOrder;
  /** How many cards peek out of the collapsed stack. @default 3 */
  visible?: number;
  /** Vertical gap between expanded cards, px. @default 12 */
  gap?: number;
};

type StackLayoutOptions = StackLayoutConfig & {
  /** Finds the measured node inside a card. The card itself renders at
   * an explicit height, so sizes are observed on a body node that
   * always keeps its natural height. @default the card's first element
   * child */
  body?: (card: HTMLElement) => HTMLElement | null;
};

type Slot = {
  index: number;
  offset: number;
  zIndex: number;
  hidden: boolean;
};

/**
 * The stack's geometry engine. Consumers register card elements and
 * mirror their rendered list through `setEntries`; the layout writes
 * the CSS protocol back onto the cards: `--index`, `--offset`,
 * `z-index`, `data-hidden`, `data-front`, `--toast-height` (the card's
 * measured natural height) and `--front-height` (the front card's).
 *
 * Heights come from a ResizeObserver watching each card's body, so
 * content updates, viewport resizes and late fonts re-measure without
 * any consumer involvement. A just-registered card has no delivered
 * height yet: its height variables stay unwritten (skins keep `auto`
 * fallbacks in their `var()`s), and the observer's first delivery,
 * still before paint, completes the pass.
 */
class StackLayout {
  #config: Required<StackLayoutConfig>;
  readonly #bodyOf: (card: HTMLElement) => HTMLElement | null;

  #entries: ReadonlyArray<StackLayoutEntry> = [];
  readonly #cards = new Map<ToastKey, HTMLElement>();
  readonly #bodies = new Map<ToastKey, HTMLElement>();
  /** Natural heights, written by the observer alone. */
  readonly #naturals = new Map<ToastKey, number>();
  #slots = new Map<ToastKey, Slot>();
  #observer: ResizeObserver | null = null;

  constructor(options: StackLayoutOptions = {}) {
    this.#config = {
      order: options.order ?? 'stack',
      visible: options.visible ?? 3,
      gap: options.gap ?? 12,
    };
    this.#bodyOf = options.body ?? defaultBodyOf;

    this.setEntries = this.setEntries.bind(this);
    this.setConfig = this.setConfig.bind(this);
    this.setCard = this.setCard.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  /** Mirrors the rendered list. Call it after the current composition's
   * cards are registered; a card registered later is caught up by its
   * body's first size delivery. */
  setEntries(entries: ReadonlyArray<StackLayoutEntry>): void {
    // Departure is decided here, by the data, never by node lifecycles:
    // ref cleanups re-run while a card is alive, the rendered list
    // dropping a key is the only reliable "truly gone". The sweep walks
    // the previous composition, not #slots: a card that was leaving
    // from its very first pass never earned a slot, yet its body is
    // already under observation and must be let go with the rest.
    const alive = new Set(entries.map((entry) => entry.key));
    for (const entry of this.#entries) {
      if (!alive.has(entry.key)) {
        this.#release(entry.key);
      }
    }

    this.#entries = entries;
    this.#apply();
  }

  /** Idempotent: re-applying the current values costs nothing. */
  setConfig(config: StackLayoutConfig): void {
    const current = this.#config;
    const next: Required<StackLayoutConfig> = {
      order: config.order ?? current.order,
      visible: config.visible ?? current.visible,
      gap: config.gap ?? current.gap,
    };

    if (
      next.order === current.order &&
      next.visible === current.visible &&
      next.gap === current.gap
    ) {
      return;
    }

    this.#config = next;
    this.#apply();
  }

  /** Registers a card's element; `null` on unmount. Registration is
   * silent: the pass runs on `setEntries`, size deliveries and config
   * changes, when the composition is complete. Detaching deliberately
   * leaves the body observation alone: ref cleanups re-run while a
   * card is alive (StrictMode replays), and only the data (a key
   * leaving `setEntries`) decides that a body is truly gone. */
  setCard(key: ToastKey, element: HTMLElement | null): void {
    if (element === null) {
      this.#cards.delete(key);
      return;
    }

    this.#cards.set(key, element);
  }

  destroy(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#cards.clear();
    this.#bodies.clear();
    this.#naturals.clear();
    this.#slots.clear();
  }

  #release(key: ToastKey): void {
    this.#cards.delete(key);
    this.#unobserve(key);
    this.#naturals.delete(key);
    this.#slots.delete(key);
  }

  #unobserve(key: ToastKey): void {
    const body = this.#bodies.get(key);
    if (body !== undefined) {
      this.#observer?.unobserve(body);
      this.#bodies.delete(key);
    }
  }

  /** Re-locates the card's body on every pass: a body replaced by a
   * content re-render moves under observation on the same commit's
   * pass, so the watched node can never go stale. */
  #syncBody(key: ToastKey, card: HTMLElement): void {
    const body = this.#bodyOf(card);
    const observed = this.#bodies.get(key);

    if (body === observed) {
      return;
    }

    this.#unobserve(key);

    if (body !== null) {
      this.#bodies.set(key, body);
      this.#observer ??= new ResizeObserver(this.#deliver);
      this.#observer.observe(body);
      // The old node's reading is void; the new body's first delivery
      // lands before paint and re-runs the pass.
      this.#naturals.delete(key);
    }
  }

  readonly #deliver: ResizeObserverCallback = (records) => {
    for (const record of records) {
      const key = this.#keyOf(record.target);
      if (key === undefined) {
        continue;
      }

      // Layout sizes only: the body sits inside a transformed (scaled)
      // card, so client rects would report the visual box, not the
      // natural one.
      const height =
        record.borderBoxSize.at(0)?.blockSize ??
        (record.target as HTMLElement).offsetHeight;

      // A zero means "no box" (a skin hiding cards via display:none),
      // not "the card became flat": keep the last real reading, or a
      // hidden front card would clamp the whole collapsed stack to
      // nothing. The next visible delivery refreshes it.
      if (height > 0) {
        this.#naturals.set(key, height);
      }
    }

    this.#apply();
  };

  /** A linear scan beats a reverse index here: deliveries are rare and
   * the stack is a handful of cards, while an element-to-key map would
   * be a second source of truth to keep in sync. */
  #keyOf(target: Element): ToastKey | undefined {
    for (const [key, body] of this.#bodies) {
      if (body === target) {
        return key;
      }
    }

    return undefined;
  }

  #apply(): void {
    const { order, visible, gap } = this.#config;
    const entries = this.#entries;
    const ordered = order === 'stack' ? entries.toReversed() : entries;
    const next = new Map<ToastKey, Slot>();
    let offset = 0;
    let depth = 0;
    let frontHeight: number | undefined;

    for (const entry of ordered) {
      const card = this.#cards.get(entry.key);

      if (card === undefined) {
        continue;
      }

      this.#syncBody(entry.key, card);

      // Leaving cards keep their frozen slot and frozen height
      // variables: an exiting card must not resize mid-flight when the
      // stack reflows around it.
      const slot = entry.leaving
        ? this.#slots.get(entry.key)
        : {
            index: depth,
            offset,
            zIndex: entries.length - depth,
            hidden: depth >= visible,
          };

      if (slot !== undefined) {
        next.set(entry.key, slot);
        card.style.setProperty('--index', String(slot.index));
        card.style.setProperty('--offset', `${slot.offset}px`);
        card.style.zIndex = String(slot.zIndex);
        card.dataset.hidden = String(slot.hidden);

        // A leaving card is past the live stack, so the front marker
        // comes off entirely: [data-front='true'] stays exclusive to
        // the one live front (an exiting front and its successor would
        // otherwise both carry it), and [data-front='false'] styling
        // (the collapsed clamp and fade) releases the ghost to its
        // frozen inline geometry.
        if (entry.leaving) {
          delete card.dataset.front;
        } else {
          card.dataset.front = String(slot.index === 0);
        }
      }

      if (!entry.leaving) {
        const height = this.#naturals.get(entry.key);

        // An unmeasured card keeps its height variables unwritten and
        // its skin fallbacks in charge; the offsets pick its height up
        // on the delivery pass.
        if (height !== undefined) {
          // Front-to-back order pays off here: the front card is the
          // first live iteration, so its height is already on hand for
          // every card behind it; the collapsed skin sizes the
          // peeking cards with it.
          if (depth === 0) {
            frontHeight = height;
          }

          card.style.setProperty('--toast-height', `${height}px`);
          if (frontHeight !== undefined) {
            card.style.setProperty('--front-height', `${frontHeight}px`);
          }
          offset += height;
        }

        offset += gap;
        depth += 1;
      }
    }

    this.#slots = next;
  }
}

function createStackLayout(options?: StackLayoutOptions): StackLayout {
  return new StackLayout(options);
}

export { StackLayout, createStackLayout };
export type {
  StackLayoutEntry,
  StackLayoutOrder,
  StackLayoutConfig,
  StackLayoutOptions,
};

// utils

function defaultBodyOf(el: HTMLElement): HTMLElement | null {
  if (el.firstElementChild instanceof HTMLElement) {
    return el.firstElementChild;
  }

  return null;
}
