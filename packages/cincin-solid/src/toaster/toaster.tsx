import type { Toaster as ToasterContract } from 'cincin';
import type { StackLayout, StackSlot, SwipeDirection } from 'cincin/dom';
import type { Toast, Presenter } from 'cincin/presenter';
import {
  createMemo,
  createRenderEffect,
  createSignal,
  mergeProps,
  For,
  Show,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useDocumentDirection } from '../shared/use-document-direction';
import { usePresenter } from '../core/use-presenter';
import { useVisibilityPause } from '../core/use-visibility-pause';
import { useStack } from '../core/use-stack';
import { useSlot } from '../core/use-slot';
import { useToastSwipe } from '../core/use-toast-swipe';
import type { ToastContent, ToasterLabels } from './content';
import { outwardDirections } from './position';
import type { ToasterPosition } from './position';
import { createToastProjection } from './projection';
import { toast as defaultToaster } from './toast';
import { useRegion } from './use-region';
import { CloseIcon, TYPE_ICONS } from './icons';

type ToasterProps = {
  /**
   * Read once, like a query client: remount to switch.
   *
   * @default package singleton
   */
  toaster?: ToasterContract<ToastContent>;
  /**
   * The region's corner (or edge center). Explicit values are
   * physical and final; the default is the bottom inline-end corner,
   * live against the document's `dir`.
   *
   * @default 'bottom-right', 'bottom-left' under RTL
   */
  position?: ToasterPosition;
  /**
   * Directions a swipe may dismiss along.
   *
   * @default the position's outward edges
   */
  swipeDirections?: readonly SwipeDirection[];
  /** How many toasts peek out of the collapsed stack. @default 3 */
  visible?: number;
  /** Active presentations at once; the rest queue. @default Infinity */
  max?: number;
  /**
   * The exit animation's length, ms. One value drives both sides: the
   * presenter's exit clock and, published as `--cincin-exit-duration`,
   * the skin's motion durations.
   *
   * @default 400
   */
  exitDuration?: number;
  /** The skin's a11y vocabulary, one place for all toasts. */
  labels?: ToasterLabels;
};

function Toaster(props: ToasterProps) {
  const merged = mergeProps(
    { visible: 3, max: Infinity, exitDuration: 400 },
    props
  );

  // A setup-time read on purpose: the toaster is read once.
  const toaster = merged.toaster ?? defaultToaster;

  const presenter = usePresenter(toaster, () => ({
    max: merged.max,
    exitDuration: merged.exitDuration,
  }));
  const projection = createToastProjection(presenter);
  // Membership is global (a queued toast joins on promotion), so this
  // memo reads every item's signal; the filter is cheap, and `For`
  // reconciles by the stable item identities anyway.
  const live = createMemo(() =>
    projection().filter((item) => item.toast().phase !== 'queued')
  );

  const [regionElement, setRegionElement] = createSignal<HTMLOListElement>();
  const region = useRegion(regionElement, presenter);
  const { layout } = useStack(
    () => live().map((item) => item.toast()),
    () => ({ visible: merged.visible })
  );

  useVisibilityPause(presenter);

  const direction = useDocumentDirection();
  const position = createMemo(
    () =>
      merged.position ??
      (direction() === 'rtl' ? 'bottom-left' : 'bottom-right')
  );
  const anchors = createMemo(() => {
    const [y, x] = position().split('-');
    return { y, x };
  });
  const directions = createMemo(
    () => merged.swipeDirections ?? outwardDirections(position())
  );

  return (
    <section
      tabIndex={-1}
      aria-label={merged.labels?.region ?? 'Notifications'}
    >
      <ol
        data-cincin-toaster
        data-y={anchors().y}
        data-x={anchors().x}
        data-expanded={String(region.expanded())}
        style={{ '--cincin-exit-duration': `${merged.exitDuration}ms` }}
        ref={setRegionElement}
        {...region.handlers}
      >
        <For each={live()}>
          {(item) => (
            <ToastCard
              toast={item.toast()}
              presenter={presenter}
              layout={layout}
              expanded={region.expanded()}
              swipeDirections={directions()}
              closeLabel={merged.labels?.close ?? 'Dismiss'}
            />
          )}
        </For>
      </ol>
    </section>
  );
}

type ToastCardProps = {
  toast: Toast<ToastContent>;
  presenter: Presenter<ToastContent>;
  layout: StackLayout;
  expanded: boolean;
  swipeDirections: readonly SwipeDirection[];
  closeLabel: string;
};

function ToastCard(props: ToastCardProps) {
  const [card, setCard] = createSignal<HTMLElement>();
  // The layout and the key are identities: a card lives and dies with
  // its projection item, so a setup-time read is the contract here.
  const slot = useSlot(card, { layout: props.layout, key: props.toast.key });
  const swipe = useToastSwipe({
    key: props.toast.key,
    presenter: props.presenter,
    directions: () => props.swipeDirections,
    enabled: () => props.toast.entry.dismissible,
  });

  const content = () => props.toast.entry.content;
  // The skin's stylesheet matches explicit 'true'/'false' strings, and
  // Solid drops an attribute for a `false` value where React and Vue
  // render the word: every stateful data attribute goes through String.
  const dataHidden = () => {
    const current = slot();
    return current === undefined ? undefined : String(current.hidden);
  };
  const dataFront = () => {
    const current = slot();
    return current === undefined || current.leaving
      ? undefined
      : String(current.front);
  };
  const inert = () => {
    const current = slot();
    return (
      current === undefined ||
      current.leaving ||
      (!props.expanded && !current.front)
    );
  };

  // Inert is written by hand, not through JSX: Solid would assign the
  // DOM property (which jsdom never reflects into the markup), and the
  // typed alternative — a `bool:inert` augmentation — leaks a global
  // `declare module 'solid-js'` into the published types. The attribute
  // is the contract (a11y and tests read the markup), so the card
  // toggles it directly.
  createRenderEffect(() => {
    card()?.toggleAttribute('inert', inert());
  });

  return (
    <li
      role={
        props.toast.entry.type === 'error' ||
        props.toast.entry.type === 'warning'
          ? 'alert'
          : 'status'
      }
      data-cincin-toast
      data-type={props.toast.entry.type}
      data-phase={props.toast.phase}
      data-dismissible={String(props.toast.entry.dismissible)}
      data-hidden={dataHidden()}
      data-front={dataFront()}
      style={{ ...createStyles(slot()), ...swipe.style() }}
      ref={setCard}
      {...swipe.handlers()}
    >
      {/* The body carries the slots and the padding; the card box above
          renders at an explicit height, while the body always keeps
          the natural one; the stack layout measures it (as the card's
          first element child). */}
      <div data-cincin-body>
        <Show when={TYPE_ICONS[props.toast.entry.type]}>
          {(Icon) => <Dynamic component={Icon()} />}
        </Show>

        <div data-cincin-content>
          <Show
            when={content().description !== undefined}
            fallback={
              // A lone title reads better in body type: it takes the
              // description slot, and the bold title style stays reserved
              // for two-line toasts.
              <div data-cincin-description>{content().title}</div>
            }
          >
            <div data-cincin-title>{content().title}</div>
            <div data-cincin-description>{content().description}</div>
          </Show>
        </div>

        <Show
          when={
            props.toast.entry.dismissible && (content().closeButton ?? true)
          }
        >
          <button
            type="button"
            data-cincin-close
            aria-label={props.closeLabel}
            onClick={() => props.presenter.dismiss(props.toast.key)}
          >
            <CloseIcon />
          </button>
        </Show>

        <Show when={content().actions}>
          {(actions) => (
            <div data-cincin-actions>
              <For each={actions()}>
                {(action) => (
                  <button
                    type="button"
                    data-cincin-action
                    data-variant={action.variant ?? 'primary'}
                    onClick={(event) => {
                      action.onClick(event);

                      if (!event.defaultPrevented) {
                        props.presenter.dismiss(props.toast.key);
                      }
                    }}
                  >
                    {action.label}
                  </button>
                )}
              </For>
            </div>
          )}
        </Show>
      </div>
    </li>
  );
}

export { Toaster };

// utils

function createStyles(slot: StackSlot | undefined): JSX.CSSProperties {
  if (slot === undefined) {
    return {};
  }

  return {
    'z-index': slot.zIndex,
    '--cincin-toast-index': String(slot.index),
    '--cincin-toast-offset': `${slot.offset}px`,
    ...(slot.height !== undefined && {
      '--cincin-toast-height': `${slot.height}px`,
    }),
    ...(slot.frontHeight !== undefined && {
      '--cincin-front-height': `${slot.frontHeight}px`,
    }),
  };
}
