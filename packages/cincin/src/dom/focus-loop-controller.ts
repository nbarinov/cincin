import { Mountable } from '../shared/mountable';
import type { ToastKey } from '../presenter';
import type { StackLayout } from './stack-layout';

/** Focus arrived inside the stack, as facts the translator read off the event. */
type FocusLoopEntry = {
  /**
   * The node focus came from; `null` when it came from inside the
   * stack or from nowhere the browser can name.
   */
  origin: HTMLElement | null;
  /** The node that took the focus: a card, or a control inside one. */
  target: Element | null;
  /** The focus is keyboard-driven (`:focus-visible`). */
  keyboard: boolean;
};

/**
 * The keyboard's way in and out of the stack. Remembers where focus
 * came from, hands it back on `escape`, and picks it up when the card
 * under it leaves. Inputs are facts (`enter`, `exit`, `escape`, `jump`), never events;
 * the layout tells it which card is the front and when the card under focus stops being live.
 * A control inside a live card can also vanish under focus
 * (an action that rewrites its toast), and no browser reports that:
 * while keyboard focus sits on a control, the loop watches its card and
 * moves the focus onto the card itself.
 * The DOM effects it owns are `focus()`, `blur()` and
 * that one observer. Acts only on keyboard-driven focus and only
 * while focus is free: a click on a cross, or a dialog that took
 * focus meanwhile, is left alone. Mounted, it watches the layout;
 * unmounted with focus inside, it hands the focus back once the
 * render has settled.
 */
class FocusLoopController extends Mountable {
  readonly #layout: StackLayout;
  #unsubscribe: (() => void) | undefined;
  #observer: MutationObserver | undefined;
  #origin: HTMLElement | null = null;
  #target: Element | null = null;
  #key: ToastKey | undefined;
  #keyboard = false;

  constructor(layout: StackLayout) {
    super();

    this.#layout = layout;

    this.enter = this.enter.bind(this);
    this.exit = this.exit.bind(this);
    this.escape = this.escape.bind(this);
    this.jump = this.jump.bind(this);
  }

  enter({ origin, target, keyboard }: FocusLoopEntry): void {
    if (origin !== null) {
      this.#origin = origin;
    }

    this.#target = target;
    this.#key = target === null ? undefined : this.#layout.keyOf(target);
    this.#keyboard = keyboard;
    this.#watch();
  }

  exit(): void {
    this.#origin = null;
    this.#forget();
  }

  escape(): void {
    this.#leave();
  }

  jump(): void {
    this.#layout.getFront()?.focus();
  }

  protected override onMount(): void {
    this.#unsubscribe = this.#layout.subscribe(({ key, slot }) => {
      if (key === this.#key && (slot === undefined || slot.leaving)) {
        this.#handOff();
      }
    });
    this.#observer = new MutationObserver(() => this.#recover());
  }

  protected override onUnmount(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#observer?.disconnect();
    this.#observer = undefined;

    if (this.#target !== null) {
      queueMicrotask(() => this.#leave());
    }
  }

  #leave(): void {
    const origin = this.#origin;
    const target = this.#target;
    this.#origin = null;
    this.#forget();

    if (origin !== null && origin.isConnected) {
      origin.focus();
      return;
    }

    if (target instanceof HTMLElement && document.activeElement === target) {
      target.blur();
    }
  }

  #handOff(): void {
    const target = this.#target;
    if (target === null || !this.#keyboard || !isFree(target)) {
      return;
    }

    const front = this.#layout.getFront();
    if (front === null) {
      this.#leave();
      return;
    }

    this.#forget();
    front.focus();
  }

  #watch(): void {
    this.#observer?.disconnect();

    const card = this.#card();
    if (
      this.#observer === undefined ||
      card === undefined ||
      card === this.#target ||
      !this.#keyboard
    ) {
      return;
    }

    this.#observer.observe(card, { childList: true, subtree: true });
  }

  #recover(): void {
    const target = this.#target;
    if (target === null || target.isConnected || !isFree(target)) {
      return;
    }

    this.#card()?.focus();
  }

  #card(): HTMLElement | undefined {
    return this.#key === undefined
      ? undefined
      : this.#layout.getCard(this.#key);
  }

  #forget(): void {
    this.#observer?.disconnect();
    this.#target = null;
    this.#key = undefined;
  }
}

function createFocusLoopController(layout: StackLayout): FocusLoopController {
  return new FocusLoopController(layout);
}

export { createFocusLoopController, FocusLoopController };
export type { FocusLoopEntry };

// utils

function isFree(target: Element): boolean {
  const active = document.activeElement;

  return active === null || active === document.body || active === target;
}
