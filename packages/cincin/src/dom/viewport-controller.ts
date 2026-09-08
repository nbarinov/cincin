import { Subscribable } from '../shared/subscribable';

type ViewportOptions = {
  /**
   * How long the stack stays open once nothing holds it, ms.
   * Bridges the gaps between cards under a moving pointer and
   * the moment a dismissed control drops focus.
   *
   * @default 200
   */
  collapseDelay?: number;
};

type ViewportListener = (expanded: boolean) => void;

/**
 * The stack's attention machine. Inputs are facts about the user's
 * attention (`hover`, `focus`, `interact`), never events:
 * the translator turns its event system into them,
 * each adapter in its own idiom.
 */
class ViewportController extends Subscribable<ViewportListener> {
  #options: Required<ViewportOptions>;
  #hovered = false;
  #focused = false;
  #interacting = false;
  #expanded = false;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: ViewportOptions = {}) {
    super();

    this.#options = { collapseDelay: options.collapseDelay ?? 200 };

    this.hover = this.hover.bind(this);
    this.focus = this.focus.bind(this);
    this.interact = this.interact.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
    this.setOptions = this.setOptions.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  getSnapshot(): boolean {
    return this.#expanded;
  }

  setOptions(options: ViewportOptions): void {
    this.#options = {
      collapseDelay: options.collapseDelay ?? this.#options.collapseDelay,
    };
  }

  hover(on: boolean): void {
    this.#hovered = on;
    this.#settle();
  }

  focus(on: boolean): void {
    this.#focused = on;
    this.#settle();
  }

  interact(on: boolean): void {
    this.#interacting = on;
    this.#settle();
  }

  destroy(): void {
    this.#cancel();
    this.clearListeners();
  }

  #settle(): void {
    if (this.#hovered || this.#focused) {
      this.#cancel();
      this.#set(true);
      return;
    }

    // A pending fold survives a gesture: the gesture only keeps a new
    // one from being armed.
    if (!this.#expanded || this.#interacting) {
      return;
    }

    // Every request re-arms the delay.
    this.#cancel();
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#set(false);
    }, this.#options.collapseDelay);
  }

  #cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }

  #set(expanded: boolean): void {
    if (this.#expanded === expanded) {
      return;
    }

    this.#expanded = expanded;
    this.notify([[expanded]]);
  }
}

function createViewportController(
  options?: ViewportOptions
): ViewportController {
  return new ViewportController(options);
}

export { createViewportController, ViewportController };
export type { ViewportOptions };
