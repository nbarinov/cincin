'use client';

import type { Toaster as ToasterContract } from 'cincin';
import type { StackLayout, StackSlot, SwipeDirection } from 'cincin/dom';
import type { Toast, Presenter } from 'cincin/presenter';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { inertValue } from '../shared/inert';
import { useComposedRefs } from '../shared/use-composed-refs';
import { usePresenter } from '../core/use-presenter';
import { useToasts } from '../core/use-toasts';
import { useVisibilityPause } from '../core/use-visibility-pause';
import { useStack } from '../core/use-stack';
import { useSlot } from '../core/use-slot';
import { useToastSwipe } from '../core/use-toast-swipe';
import type { ToastContent, ToasterLabels } from './content';
import { toast as defaultToaster } from './toast';
import { useRegion } from './use-region';
import { CLOSE_ICON, TYPE_ICONS } from './icons';

type ToasterProps = {
  /** @default package singleton */
  toaster?: ToasterContract<ToastContent>;
  /** The skin's a11y vocabulary, one place for all toasts. */
  labels?: ToasterLabels;
  /** @default 'right' */
  swipeDirection?: SwipeDirection;
  /** How many toasts peek out of the collapsed stack. @default 3 */
  visible?: number;
  /** Active presentations at once; the rest queue. @default Infinity */
  max?: number;
  /** The exit animation's length, ms. One value drives both sides: the
   * presenter's exit clock and, published as `--cincin-exit-duration`,
   * the skin's motion durations. @default 400 */
  exitDuration?: number;
};

function Toaster({
  toaster = defaultToaster,
  labels = {},
  swipeDirection = 'right',
  visible = 3,
  max = Infinity,
  exitDuration = 400,
}: ToasterProps) {
  const presenter = usePresenter(toaster, { max, exitDuration });
  const toasts = useToasts(presenter);
  const live = useMemo(
    () => toasts.filter((toast) => toast.phase !== 'queued'),
    [toasts]
  );

  const region = useRegion(presenter);
  const stack = useStack(live, { visible });

  useVisibilityPause(presenter);

  const {
    region: regionLabel = 'Notifications',
    close: closeLabel = 'Dismiss',
  } = labels;

  return (
    <section tabIndex={-1} aria-label={regionLabel}>
      <ol
        data-cincin-toaster
        data-expanded={region.expanded}
        style={
          { '--cincin-exit-duration': `${exitDuration}ms` } as CSSProperties
        }
        ref={region.ref}
        {...region.handlers}
      >
        {live.map((toast) => (
          <ToastCard
            key={toast.key}
            toast={toast}
            presenter={presenter}
            layout={stack.layout}
            expanded={region.expanded}
            swipeDirection={swipeDirection}
            closeLabel={closeLabel}
          />
        ))}
      </ol>
    </section>
  );
}

type ToastCardProps = {
  toast: Toast<ToastContent>;
  presenter: Presenter<ToastContent>;
  layout: StackLayout;
  expanded: boolean;
  swipeDirection: SwipeDirection;
  closeLabel: string;
};

function ToastCard({
  toast,
  presenter,
  layout,
  expanded,
  swipeDirection,
  closeLabel,
}: ToastCardProps) {
  const { key, entry, phase } = toast;
  const { ref: slotRef, slot } = useSlot({ layout, key });
  const swipeRef = useToastSwipe({
    key,
    presenter,
    direction: swipeDirection,
    enabled: entry.dismissible,
  });
  const composedRef = useComposedRefs(swipeRef, slotRef);

  const { title, description, actions, closeButton = true } = entry.content;

  return (
    <li
      role={
        entry.type === 'error' || entry.type === 'warning' ? 'alert' : 'status'
      }
      data-cincin-toast
      data-type={entry.type}
      data-phase={phase}
      data-dismissible={entry.dismissible}
      data-hidden={slot === undefined ? undefined : String(slot.hidden)}
      data-front={
        slot === undefined || slot.leaving ? undefined : String(slot.front)
      }
      style={createStyles(slot)}
      inert={inertValue(
        slot === undefined || slot.leaving || (!expanded && !slot.front)
      )}
      ref={composedRef}
    >
      {/* The body carries the slots and the padding; the card box above
          renders at an explicit height, while the body always keeps
          the natural one; the stack layout measures it (as the card's
          first element child). */}
      <div data-cincin-body>
        {TYPE_ICONS[entry.type]}

        <div data-cincin-content>
          {description === undefined ? (
            // A lone title reads better in body type: it takes the
            // description slot, and the bold title style stays reserved
            // for two-line toasts.
            <div data-cincin-description>{title}</div>
          ) : (
            <>
              <div data-cincin-title>{title}</div>
              <div data-cincin-description>{description}</div>
            </>
          )}
        </div>

        {entry.dismissible && closeButton && (
          <button
            type="button"
            data-cincin-close
            aria-label={closeLabel}
            onClick={() => presenter.dismiss(key)}
          >
            {CLOSE_ICON}
          </button>
        )}

        {actions !== undefined && (
          <div data-cincin-actions>
            {actions.map((action, index) => (
              <button
                key={index}
                type="button"
                data-cincin-action
                data-variant={action.variant ?? 'primary'}
                onClick={(event) => {
                  action.onClick(event);

                  if (!event.defaultPrevented) {
                    presenter.dismiss(key);
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export { Toaster };

// utils

function createStyles(slot: StackSlot | undefined): CSSProperties {
  if (slot === undefined) {
    return {};
  }

  return {
    zIndex: slot.zIndex,
    '--cincin-toast-index': slot.index,
    '--cincin-toast-offset': `${slot.offset}px`,
    '--cincin-toast-height':
      slot.height === undefined ? undefined : `${slot.height}px`,
    '--cincin-front-height':
      slot.frontHeight === undefined ? undefined : `${slot.frontHeight}px`,
  } as CSSProperties;
}
