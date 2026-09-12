import {
  createSwipeController,
  createSwipeHandlers,
  touchActionFor,
} from 'cincin/dom';
import type {
  SwipeController,
  SwipeDirection,
  SwipeHandlers,
  SwipeTuning,
} from 'cincin/dom';
import type { Presenter, ToastKey } from 'cincin/presenter';
import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { Signal } from '@angular/core';

type Swipe = {
  controller: SwipeController;
  handlers: SwipeHandlers;
};

/**
 * The swipe-to-dismiss gesture on a card. The host listeners translate
 * pointer events into the gesture protocol (the machine takes the
 * element lazily from the first `start`), the trailing click the
 * browser synthesizes after a drag is spent by a capture-phase
 * listener (no template syntax reaches that phase), and the static
 * touch-action claim rides the host style: the browser must know the
 * reserved axis before any gesture. The controller is built after the
 * render, once the inputs have landed, and rebuilt on a changed
 * directions source (keyed by its joined contents, not the array
 * identity); the key, the presenter and the tuning are read once.
 * `enabled` false tears the controller down: no handlers, no claim,
 * and a gesture in flight settles through destroy.
 */
@Directive({
  selector: '[cincinToastSwipe]',
  exportAs: 'cincinToastSwipe',
  host: {
    '[style.touch-action]': 'touchAction()',
    '(pointerdown)': 'swipe()?.handlers.pointerdown($event)',
    '(pointermove)': 'swipe()?.handlers.pointermove($event)',
    '(pointerup)': 'swipe()?.handlers.pointerup($event)',
    '(pointercancel)': 'swipe()?.handlers.pointercancel($event)',
  },
})
class CincinToastSwipe {
  readonly key = input.required<ToastKey>();
  readonly presenter = input.required<Presenter<{}>>();
  /**
   * Directions a swipe may dismiss along.
   *
   * @default ['right', 'down']
   */
  readonly directions = input<readonly SwipeDirection[]>();
  /** The gesture's tuning, read once. */
  readonly tuning = input<SwipeTuning>();
  /**
   * Whether the gesture exists at all. A non-dismissible toast gets
   * no swipe: no handlers, and no touch-action claim either.
   *
   * @default true
   */
  readonly enabled = input(true);

  /** The live machine and its translator, `undefined` while disabled. */
  readonly swipe: Signal<Swipe | undefined>;
  readonly touchAction = computed(() => {
    const swipe = this.swipe();

    return swipe === undefined
      ? null
      : touchActionFor(swipe.controller.directions);
  });

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroy = inject(DestroyRef);
    const swipe = signal<Swipe | undefined>(undefined);
    const directionsKey = computed(() => this.directions()?.join(' '));

    this.swipe = swipe.asReadonly();

    afterRenderEffect((onCleanup) => {
      if (!this.enabled()) {
        swipe.set(undefined);
        return;
      }

      directionsKey();

      const controller = untracked(() => {
        const key = this.key();
        const presenter = this.presenter();

        return createSwipeController({
          ...this.tuning(),
          directions: this.directions(),
          onDismiss: () => presenter.dismiss(key),
          onRemove: () => presenter.finish(key),
        });
      });

      swipe.set({ controller, handlers: createSwipeHandlers(controller) });
      onCleanup(() => controller.destroy());
    });

    afterNextRender(() => {
      const click = (event: MouseEvent): void => {
        swipe()?.handlers.click(event);
      };

      element.addEventListener('click', click, true);
      destroy.onDestroy(() =>
        element.removeEventListener('click', click, true)
      );
    });
  }
}

export { CincinToastSwipe };
