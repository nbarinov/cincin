import { Subscribable } from '../shared/subscribable';
import { shallowEqual } from '../shared/utils';
import type { ToastKey } from '../presenter';

/** One rendered card, as the renderer sees it. The layout deliberately
 * speaks its own minimal vocabulary instead of the presenter's phases:
 * `entries` mirrors what is actually in the DOM, and the only lifecycle
 * fact geometry cares about is "this card is exiting". */
type StackLayoutEntry = {
  key: ToastKey;
  /** The card is exiting: its slot freezes, and it vacates its place
   * for the survivors. */
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

/**
 * One card's place in the stack, as computed data. The layout publishes
 * these instead of writing styles itself; the consumer puts a slot onto
 * its card in the CSS protocol's vocabulary (docs/protocol.md), and
 * semantic consumers (the `inert` rule) read `front`/`leaving`
 * directly.
 */
type StackSlot = {
  /** Depth from the front, `0` on the front card. */
  index: number;
  /** The card's expanded position: accumulated heights and gaps of the
   * live cards in front of it, px. */
  offset: number;
  zIndex: number;
  /** Past the collapsed peek (the `visible` config). */
  hidden: boolean;
  /** The single live front card. Never `true` on a leaving one. */
  front: boolean;
  /** The slot is frozen: an exiting card must not resize or move
   * mid-flight while the survivors reflow around it. */
  leaving: boolean;
  /** The card's measured natural height, px; `undefined` until the
   * first delivery (consumers keep fallbacks for that gap). */
  height: number | undefined;
  /** The front card's natural height, for the collapsed clamp. */
  frontHeight: number | undefined;
};

type StackSlotEvent = {
  key: ToastKey;
  /** `undefined`: the key left the composition. */
  slot: StackSlot | undefined;
  /** `undefined`: the slot just appeared. */
  prev: StackSlot | undefined;
};

type StackSlotListener = (event: StackSlotEvent) => void;

/**
 * The stack's geometry engine. Consumers register card elements and
 * mirror their rendered list through `setEntries`; the layout computes
 * a `StackSlot` per card and publishes changes as `StackSlotEvent`s
 * (`subscribe`/`getSlot`). It writes nothing to the DOM itself: the
 * consumers write the CSS protocol off the slot data, each in its own
 * idiom. Slot objects are stable: a pass that
 * changes nothing for a card keeps the previous reference (and stays
 * silent), so snapshots are safe for `useSyncExternalStore`.
 *
 * Heights come from a ResizeObserver watching each card's body, so
 * content updates, viewport resizes and late fonts re-measure without
 * any consumer involvement. A just-registered card has no delivered
 * height yet: its slot carries `height: undefined` (skins keep `auto`
 * fallbacks in their `var()`s), and the observer's first delivery,
 * still before paint, completes the pass.
 */
class StackLayout extends Subscribable<StackSlotListener> {
  #config: Required<StackLayoutConfig>;
  readonly #bodyOf: (card: HTMLElement) => HTMLElement | null;

  #entries: ReadonlyArray<StackLayoutEntry> = [];
  readonly #cards = new Map<ToastKey, HTMLElement>();
  readonly #bodies = new Map<ToastKey, HTMLElement>();
  /** Natural heights, written by the observer alone. */
  readonly #naturals = new Map<ToastKey, number>();
  #slots = new Map<ToastKey, StackSlot>();
  #observer: ResizeObserver | null = null;

  constructor(options: StackLayoutOptions = {}) {
    super();

    this.#config = {
      order: options.order ?? 'stack',
      visible: options.visible ?? 3,
      gap: options.gap ?? 12,
    };
    this.#bodyOf = options.body ?? defaultBodyOf;

    this.setEntries = this.setEntries.bind(this);
    this.setConfig = this.setConfig.bind(this);
    this.setCard = this.setCard.bind(this);
    this.getSlot = this.getSlot.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  getSlot(key: ToastKey): StackSlot | undefined {
    return this.#slots.get(key);
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
    this.clearListeners();
  }

  #release(key: ToastKey): void {
    // The slot itself stays until the pass: its removal is published as
    // a `slot: undefined` event by the diff, not silently dropped here.
    this.#cards.delete(key);
    this.#unobserve(key);
    this.#naturals.delete(key);
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
      // The old node's reading is kept until the new body's first
      // delivery (still before paint) overwrites it: retracting the
      // height would snap the card through `auto` for a frame. Same
      // doctrine as zero deliveries: no reading means "keep the last
      // real one", never "the card lost its box".
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
    const prev = this.#slots;
    const next = new Map<ToastKey, StackSlot>();
    let offset = 0;
    let depth = 0;
    let frontHeight: number | undefined;

    for (const entry of ordered) {
      const card = this.#cards.get(entry.key);

      if (card === undefined) {
        continue;
      }

      this.#syncBody(entry.key, card);

      // A leaving card keeps its frozen slot: the live markers flip
      // once ([data-front] exclusivity: an exiting front and its
      // successor must never both carry it), then the object stops
      // changing and its subscribers stay quiet.
      if (entry.leaving) {
        const before = prev.get(entry.key);
        if (before !== undefined) {
          next.set(
            entry.key,
            before.leaving ? before : { ...before, leaving: true, front: false }
          );
        }
        continue;
      }

      const height = this.#naturals.get(entry.key);

      // Front-to-back order pays off here: the front card is the first
      // live iteration, so its height is already on hand for every card
      // behind it; the collapsed skin clamps the peeking cards with it.
      if (depth === 0 && height !== undefined) {
        frontHeight = height;
      }

      const before = prev.get(entry.key);
      const candidate: StackSlot = {
        index: depth,
        offset,
        zIndex: entries.length - depth,
        hidden: depth >= visible,
        front: depth === 0,
        leaving: false,
        height,
        // An unmeasured card publishes no heights at all (its consumers
        // keep their fallbacks), and an unmeasured new front does not
        // retract the clamp the backs already carry: they keep the last
        // known front height until the delivery lands, so their height
        // transition stays px to px instead of snapping through `auto`.
        frontHeight:
          height !== undefined
            ? (frontHeight ?? before?.frontHeight)
            : undefined,
      };

      if (height !== undefined) {
        offset += height;
      }
      offset += gap;
      depth += 1;

      next.set(
        entry.key,
        before !== undefined && shallowEqual(before, candidate)
          ? before
          : candidate
      );
    }

    this.#slots = next;

    // The commit protocol: the state above is already in place, the
    // collected diff goes out through the shared notify (a listener
    // reading `getSlot` during any event sees the finished pass).
    const events: Array<[StackSlotEvent]> = [];
    for (const [key, slot] of next) {
      const before = prev.get(key);
      if (before !== slot) {
        events.push([{ key, slot, prev: before }]);
      }
    }

    for (const [key, before] of prev) {
      if (!next.has(key)) {
        events.push([{ key, slot: undefined, prev: before }]);
      }
    }

    this.notify(events);
  }
}

function createStackLayout(options?: StackLayoutOptions): StackLayout {
  return new StackLayout(options);
}

export { createStackLayout };
export type {
  StackLayout,
  StackLayoutEntry,
  StackLayoutOrder,
  StackLayoutConfig,
  StackLayoutOptions,
  StackSlot,
  StackSlotEvent,
};

// utils

function defaultBodyOf(el: HTMLElement): HTMLElement | null {
  if (el.firstElementChild instanceof HTMLElement) {
    return el.firstElementChild;
  }

  return null;
}
