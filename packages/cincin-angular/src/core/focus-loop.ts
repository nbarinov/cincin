import { createFocusLoopController, createFocusLoopHandlers } from 'cincin/dom';
import type {
  FocusLoopController,
  FocusLoopHandlers,
  StackLayout,
} from 'cincin/dom';
import {
  DestroyRef,
  Directive,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import type { OnInit } from '@angular/core';

/**
 * The keyboard's way in and out of the stack, on the region element:
 * the loop's edge is the landmark, not the list. The layout is read
 * once, on init (the machine is built on it), the loop runs from the
 * first render to destroy, and `jump` is the consumer's to bind, to a
 * hotkey or anything else.
 */
@Directive({
  selector: '[cincinFocusLoop]',
  exportAs: 'cincinFocusLoop',
  host: {
    '(focusin)': 'handlers?.focusin($event)',
    '(focusout)': 'handlers?.focusout($event)',
    '(keydown)': 'handlers?.keydown($event)',
    '(pointerdown)': 'handlers?.pointerdown()',
    '(pointerup)': 'handlers?.pointerup()',
    '(pointercancel)': 'handlers?.pointercancel()',
  },
})
class CincinFocusLoop implements OnInit {
  readonly layout = input.required<StackLayout>();

  /** The element half of the translator, bound by the host listeners. */
  handlers: FocusLoopHandlers['element'] | undefined;

  #loop: FocusLoopController | undefined;

  constructor() {
    const destroy = inject(DestroyRef);

    afterNextRender(() => {
      this.#loop?.mount();
      destroy.onDestroy(() => this.#loop?.unmount());
    });
  }

  ngOnInit(): void {
    this.#loop = createFocusLoopController(this.layout());
    this.handlers = createFocusLoopHandlers(this.#loop).element;
  }

  /** Moves focus onto the front card, remembering where it came from. */
  jump(): void {
    this.#loop?.jump();
  }
}

export { CincinFocusLoop };
