import type { StackSlot } from 'cincin/dom';
import type { Toast, Presenter } from 'cincin/presenter';
import { Component, computed, inject, input } from '@angular/core';
import { CincinSlot, CincinToastSwipe } from 'cincin-angular/core';
import type { ToastAction, ToastContent } from './content';

/**
 * One card: the list item itself (an attribute selector keeps the
 * skin's markup), measured through the slot directive and swiped
 * through the swipe directive, both riding the host. The card's
 * attributes and custom properties are projections of its slot, its
 * phase and the stack's expansion; the ids follow the toast key, which
 * is unique per toaster and the same on the server and the client.
 */
@Component({
  selector: 'li[cincinToastCard]',
  hostDirectives: [
    { directive: CincinSlot, inputs: ['layout', 'key'] },
    {
      directive: CincinToastSwipe,
      inputs: ['key', 'presenter', 'directions: swipeDirections', 'enabled'],
    },
  ],
  host: {
    '[attr.role]': 'role()',
    tabindex: '0',
    '[attr.aria-labelledby]': 'titleId()',
    '[attr.aria-describedby]': 'described() ? descriptionId() : null',
    'data-cincin-toast': '',
    '[attr.data-type]': 'toast().entry.type',
    '[attr.data-phase]': 'toast().phase',
    '[attr.data-dismissible]': 'toast().entry.dismissible',
    '[attr.data-hidden]': 'slot()?.hidden',
    '[attr.data-front]': 'front()',
    '[attr.inert]': "inert() ? '' : null",
    '[style.z-index]': 'slot()?.zIndex',
    '[style.--cincin-toast-index]': 'slot()?.index',
    '[style.--cincin-toast-offset.px]': 'slot()?.offset',
    '[style.--cincin-toast-height.px]': 'slot()?.height',
    '[style.--cincin-front-height.px]': 'slot()?.frontHeight',
  },
  template: `
    <!-- The body carries the slots and the padding; the card box above
         renders at an explicit height, while the body always keeps
         the natural one; the stack layout measures it (as the card's
         first element child). -->
    <div data-cincin-body>
      @switch (toast().entry.type) {
        @case ('success') {
          <svg
            data-cincin-icon
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="10" cy="10" r="8.2" />
            <path d="M6.6 10.4l2.3 2.3 4.5-4.9" />
          </svg>
        }
        @case ('error') {
          <svg
            data-cincin-icon
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="10" cy="10" r="8.2" />
            <path d="M7.4 7.4l5.2 5.2M12.6 7.4l-5.2 5.2" />
          </svg>
        }
        @case ('warning') {
          <svg
            data-cincin-icon
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 3.4 18 16.6H2L10 3.4Z" />
            <path d="M10 8.6v3.2" />
            <path d="M10 14.3v.01" />
          </svg>
        }
        @case ('info') {
          <svg
            data-cincin-icon
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="10" cy="10" r="8.2" />
            <path d="M10 6.4v.01" />
            <path d="M10 9.4v4.2" />
          </svg>
        }
        @case ('loading') {
          <svg
            data-cincin-icon
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M18.2 10a8.2 8.2 0 0 0-8.2-8.2" />
          </svg>
        }
      }

      <div data-cincin-content>
        @if (described()) {
          <div [id]="titleId()" data-cincin-title>{{ content().title }}</div>
          <div [id]="descriptionId()" data-cincin-description>
            {{ content().description }}
          </div>
        } @else {
          <!-- A lone title reads better in body type: it takes the
               description slot, and the bold title style stays reserved
               for two-line toasts. The id follows the text, not the slot. -->
          <div [id]="titleId()" data-cincin-description>
            {{ content().title }}
          </div>
        }
      </div>

      @if (toast().entry.dismissible && (content().closeButton ?? true)) {
        <button
          type="button"
          data-cincin-close
          [attr.aria-label]="closeLabel()"
          (click)="presenter().dismiss(toast().key)"
        >
          <svg
            data-cincin-icon
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      }

      @if (content().actions; as actions) {
        <div data-cincin-actions>
          @for (action of actions; track $index) {
            <button
              type="button"
              data-cincin-action
              [attr.data-variant]="action.variant ?? 'primary'"
              (click)="onAction(action, $event)"
            >
              {{ action.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
class ToastCard {
  readonly toast = input.required<Toast<ToastContent>>();
  readonly presenter = input.required<Presenter<ToastContent>>();
  readonly expanded = input.required<boolean>();
  readonly closeLabel = input.required<string>();

  readonly slot = inject(CincinSlot).slot;

  readonly content = computed(() => this.toast().entry.content);
  readonly described = computed(() => this.content().description !== undefined);
  readonly titleId = computed(() => `cincin-${this.toast().key}-title`);
  readonly descriptionId = computed(
    () => `cincin-${this.toast().key}-description`
  );
  readonly role = computed(() => {
    const { type } = this.toast().entry;

    return type === 'error' || type === 'warning' ? 'alert' : 'status';
  });
  readonly front = computed(() => {
    const slot = this.slot();

    return slot === undefined || slot.leaving ? null : slot.front;
  });
  readonly inert = computed(() => {
    const slot = this.slot();

    return (
      slot === undefined || slot.leaving || (!this.expanded() && !slot.front)
    );
  });

  onAction(action: ToastAction, event: MouseEvent): void {
    action.onClick(event);

    if (!event.defaultPrevented) {
      this.presenter().dismiss(this.toast().key);
    }
  }
}

export { ToastCard };
export type { StackSlot };
