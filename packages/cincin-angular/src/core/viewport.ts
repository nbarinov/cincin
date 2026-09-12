import { createViewportController, createViewportHandlers } from 'cincin/dom';
import type { ViewportHandlers } from 'cincin/dom';
import type { Presenter, PresenterHolder } from 'cincin/presenter';
import {
  DestroyRef,
  Directive,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import type { OnInit, Signal } from '@angular/core';
import { injectSnapshot } from './inject-snapshot';

/**
 * The stack's attention on its viewport element. The host listeners
 * feed the translator (the boundary events, the pointer, the bubbling
 * focus pair), the document listeners end a hover from outside, and
 * `expanded` is the machine's verdict as a signal. While open, the
 * viewport holds the presenter's clocks through the holder, if given.
 * The presenter is read once, on init; the holder and the delay stay
 * live.
 */
@Directive({
  selector: '[cincinViewport]',
  exportAs: 'cincinViewport',
  host: {
    '(mouseenter)': 'handlers.mouseenter($event)',
    '(mousemove)': 'handlers.mousemove($event)',
    '(mouseleave)': 'handlers.mouseleave($event)',
    '(lostpointercapture)': 'handlers.lostpointercapture($event)',
    '(pointerdown)': 'handlers.pointerdown($event)',
    '(pointerup)': 'handlers.pointerup($event)',
    '(pointercancel)': 'handlers.pointercancel($event)',
    '(focusin)': 'handlers.focusin($event)',
    '(focusout)': 'handlers.focusout($event)',
  },
})
class CincinViewport implements OnInit {
  readonly presenter = input.required<Presenter<{}>>();
  readonly holder = input<PresenterHolder>();
  /**
   * How long the stack stays open once nothing holds it, ms.
   *
   * @default 200
   */
  readonly collapseDelay = input<number>();

  readonly expanded: Signal<boolean>;
  /** The element half of the translator, bound by the host listeners. */
  readonly handlers: ViewportHandlers['element'];

  readonly #controller = createViewportController();
  readonly #destroy = inject(DestroyRef);

  constructor() {
    const viewport = createViewportHandlers(this.#controller);

    this.handlers = viewport.element;
    this.expanded = injectSnapshot(this.#controller);

    effect(() => {
      this.#controller.setOptions({ collapseDelay: this.collapseDelay() });
    });

    effect((onCleanup) => {
      const holder = this.holder();

      if (!this.expanded() || holder === undefined) {
        return;
      }

      onCleanup(holder.hold(Symbol('viewport')));
    });

    afterNextRender(() => {
      const { pointerdown, pointerover } = viewport.document;
      document.addEventListener('pointerdown', pointerdown);
      document.addEventListener('pointerover', pointerover);

      this.#destroy.onDestroy(() => {
        document.removeEventListener('pointerdown', pointerdown);
        document.removeEventListener('pointerover', pointerover);
      });
    });

    this.#destroy.onDestroy(() => this.#controller.destroy());
  }

  ngOnInit(): void {
    const presenter = this.presenter();

    this.#destroy.onDestroy(
      presenter.subscribe(() => {
        if (presenter.count() === 0) {
          this.#controller.hover(false);
        }
      })
    );
  }
}

export { CincinViewport };
