import type { Hotkey, SwipeDirection } from 'cincin/dom';
import {
  Component,
  ViewEncapsulation,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { anchorsOf, outwardDirections } from 'cincin-skin';
import type { ToasterPosition } from 'cincin-skin';
import {
  CincinFocusLoop,
  CincinStack,
  CincinViewport,
  injectDocumentDirection,
  injectHotkey,
  injectPresenter,
  injectPresenterHolder,
  injectToasts,
  injectVisibilityPause,
} from 'cincin-angular/core';
import type { ToasterLabels } from './content';
import { injectToaster } from './context';
import { ToastCard } from './toast-card';

const DEFAULT_HOTKEY: Hotkey = 'Alt+T';

/**
 * The ready-to-use toaster. The toaster instance comes through DI
 * (`provideToaster`), the package singleton by default, and is read
 * once; everything else is a live input. The shared stylesheet is
 * inlined by the compiler and applied globally, so the one import of
 * the component brings the skin along.
 */
@Component({
  selector: 'cincin-toaster',
  imports: [CincinFocusLoop, CincinStack, CincinViewport, ToastCard],
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../cincin-skin/src/styles.css',
  template: `
    <section
      cincinFocusLoop
      [layout]="stack.layout"
      tabindex="-1"
      [attr.aria-label]="regionLabel()"
      [attr.aria-keyshortcuts]="hotkey() === false ? null : hotkey()"
    >
      <ol
        cincinStack
        #stack="cincinStack"
        [entries]="live()"
        [visible]="visible()"
        order="queue"
        cincinViewport
        #viewport="cincinViewport"
        [presenter]="presenter"
        [holder]="holder"
        data-cincin-toaster
        [attr.data-y]="anchors().y"
        [attr.data-x]="anchors().x"
        [attr.data-expanded]="viewport.expanded()"
        [style.--cincin-exit-duration]="exitDuration() + 'ms'"
      >
        @for (toast of live(); track toast.key) {
          <li
            cincinToastCard
            [toast]="toast"
            [presenter]="presenter"
            [layout]="stack.layout"
            [key]="toast.key"
            [swipeDirections]="directions()"
            [enabled]="toast.entry.dismissible"
            [expanded]="viewport.expanded()"
            [closeLabel]="closeLabel()"
          ></li>
        }
      </ol>
    </section>
  `,
})
class Toaster {
  /**
   * The region's corner (or edge center). Explicit values are
   * physical and final; the default is the bottom inline-end corner,
   * live against the document's `dir`.
   *
   * @default 'bottom-right', 'bottom-left' under RTL
   */
  readonly position = input<ToasterPosition>();
  /**
   * Directions a swipe may dismiss along.
   *
   * @default the position's outward edges
   */
  readonly swipeDirections = input<readonly SwipeDirection[]>();
  /** How many toasts peek out of the collapsed stack. @default 3 */
  readonly visible = input(3);
  /** Active presentations at once; the rest queue. @default Infinity */
  readonly max = input(Infinity);
  /**
   * The exit animation's length, ms.
   * One value drives both sides:
   * the presenter's exit clock and,
   * published as `--cincin-exit-duration`,
   * the skin's motion durations.
   *
   * @default 400
   */
  readonly exitDuration = input(400);
  /** The skin's a11y vocabulary, one place for all toasts. */
  readonly labels = input<ToasterLabels>({});
  /**
   * Moves focus onto the front toast from anywhere on the page.
   * `false` drops the shortcut; Tab and Escape still work.
   *
   * @default 'Alt+T'
   */
  readonly hotkey = input<Hotkey | false>(DEFAULT_HOTKEY);

  readonly presenter = injectPresenter(injectToaster(), () => ({
    max: this.max(),
    exitDuration: this.exitDuration(),
  }));
  readonly holder = injectPresenterHolder(this.presenter);
  readonly toasts = injectToasts(this.presenter);
  readonly live = computed(() =>
    this.toasts()
      .filter((toast) => toast.phase !== 'queued')
      .toReversed()
  );

  readonly focusLoop = viewChild.required(CincinFocusLoop);

  readonly direction = injectDocumentDirection();
  readonly resolvedPosition = computed(
    () =>
      this.position() ??
      (this.direction() === 'rtl' ? 'bottom-left' : 'bottom-right')
  );
  readonly anchors = computed(() => anchorsOf(this.resolvedPosition()));
  readonly directions = computed(
    () => this.swipeDirections() ?? outwardDirections(this.resolvedPosition())
  );

  readonly regionLabel = computed(
    () => this.labels().region ?? 'Notifications'
  );
  readonly closeLabel = computed(() => this.labels().close ?? 'Dismiss');

  constructor() {
    injectHotkey(() => ({
      hotkey: this.hotkey(),
      onPress: () => this.focusLoop().jump(),
    }));
    injectVisibilityPause(this.holder);
  }
}

export { Toaster };
