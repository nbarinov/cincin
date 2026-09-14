import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ToasterPosition } from 'cincin-angular';

type Clearance = {
  x: number;
  y: number;
};

const GAP = 12;

@Component({
  selector: 'app-chat-widget',
  host: {
    'data-widget': '',
    '[attr.data-y]': 'y()',
    '[attr.data-x]': 'x()',
    '[attr.data-open]': 'open()',
  },
  template: `
    <button
      type="button"
      [attr.aria-expanded]="open()"
      (click)="open.set(!open())"
    >
      {{ open() ? 'Chat ↓' : '💬' }}
    </button>

    @if (open()) {
      <p>Hi! Nobody is reading this, it is here to take up room.</p>
    }
  `,
})
class ChatWidget {
  readonly position = input.required<ToasterPosition>();
  readonly clearance = output<Clearance>();

  readonly open = signal(false);
  readonly y = computed(() => this.position().split('-')[0]);
  readonly x = computed(() => this.position().split('-')[1]);

  constructor() {
    const element: HTMLElement = inject(ElementRef).nativeElement;
    const observer = new ResizeObserver(() => {
      this.clearance.emit({
        x: element.offsetWidth + GAP,
        y: element.offsetHeight + GAP,
      });
    });

    observer.observe(element);

    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      this.clearance.emit({ x: 0, y: 0 });
    });
  }
}

export { ChatWidget };
export type { Clearance };
