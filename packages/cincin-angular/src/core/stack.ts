import { attachViewportBox, createStackLayout } from 'cincin/dom';
import type { StackLayout, StackLayoutOrder } from 'cincin/dom';
import type { Toast } from 'cincin/presenter';
import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  effect,
  inject,
  input,
} from '@angular/core';

/**
 * The stack layout on its viewport box. The layout is created with the
 * directive (the template reads it before the inputs land), the live
 * options follow their inputs during change detection, and the entries
 * pass runs after the render: by then every card of the same pass has
 * registered itself with the layout.
 */
@Directive({ selector: '[cincinStack]', exportAs: 'cincinStack' })
class CincinStack {
  readonly entries =
    input.required<ReadonlyArray<Pick<Toast, 'key' | 'phase'>>>();
  /** Which end of `entries` is the front card. @default 'stack' */
  readonly order = input<StackLayoutOrder>();
  /** How many cards peek out of the collapsed stack. @default 3 */
  readonly visible = input<number>();
  /** Vertical gap between expanded cards, px. @default 12 */
  readonly gap = input<number>();

  readonly layout: StackLayout = createStackLayout();

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroy = inject(DestroyRef);

    effect(() => {
      this.layout.setOptions({
        order: this.order(),
        visible: this.visible(),
        gap: this.gap(),
      });
    });

    afterRenderEffect(() => {
      this.layout.setEntries(
        this.entries().map((toast) => ({
          key: toast.key,
          leaving: toast.phase === 'leaving',
        }))
      );
    });

    afterNextRender(() => {
      destroy.onDestroy(attachViewportBox(element, this.layout));
    });

    destroy.onDestroy(() => this.layout.destroy());
  }
}

export { CincinStack };
