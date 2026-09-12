import { isPlatformBrowser } from '@angular/common';
import { createSlotObserver } from 'cincin/dom';
import type { StackLayout, StackSlot } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  inject,
  input,
  signal,
} from '@angular/core';
import type { OnInit, Signal } from '@angular/core';

/**
 * One card's slot, live: a slot observer under the hood, bound to a
 * signal. The host element is registered for measurement on init (the
 * inputs have landed by then, and the stack's entries pass is still
 * ahead), and detached with the directive. The layout and the key are
 * read once: a card lives and dies with its list key, so they cannot
 * change under a live instance.
 */
@Directive({ selector: '[cincinSlot]', exportAs: 'cincinSlot' })
class CincinSlot implements OnInit {
  readonly layout = input.required<StackLayout>();
  readonly key = input.required<ToastKey>();

  readonly slot: Signal<StackSlot | undefined>;

  readonly #slot = signal<StackSlot | undefined>(undefined);
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #destroy = inject(DestroyRef);
  readonly #browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    this.slot = this.#slot.asReadonly();
  }

  ngOnInit(): void {
    if (!this.#browser) {
      return;
    }

    const observer = createSlotObserver(this.layout(), { key: this.key() });

    this.#slot.set(observer.getSnapshot());
    this.#destroy.onDestroy(
      observer.subscribe(() => {
        this.#slot.set(observer.getSnapshot());
      })
    );
    this.#destroy.onDestroy(observer.observe(this.#element));
  }
}

export { CincinSlot };
