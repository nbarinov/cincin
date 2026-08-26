'use client';

import type { Toaster as ToasterContract } from 'cincin';
import type { SwipeDirection } from 'cincin/dom';
import type { Toast, Presenter } from 'cincin/presenter';
import { useMemo } from 'react';
import type { CSSProperties, Ref } from 'react';
import { useComposedRefs } from '../shared/use-composed-refs';
import { usePresenter } from '../core/use-presenter';
import { useToasts } from '../core/use-toasts';
import { useVisibilityPause } from '../core/use-visibility-pause';
import { useStack } from '../core/use-stack';
import { useToastSwipe } from '../core/use-toast-swipe';
import type { ToastContent } from './content';
import { toast as defaultToaster } from './toast';
import { useRegion } from './use-region';
import { CLOSE_ICON, TYPE_ICONS } from './icons';

type ToasterProps = {
  /** @default package singleton */
  toaster?: ToasterContract<ToastContent>;
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
  swipeDirection = 'right',
  visible = 3,
  max = Infinity,
  exitDuration = 400,
}: ToasterProps) {
  const presenter = usePresenter(toaster, { max, exitDuration });
  const toasts = useToasts(presenter);
  const shown = useMemo(
    () => toasts.filter((toast) => toast.phase !== 'queued'),
    [toasts]
  );
  // The stack order's front: the newest live toast. Everything behind
  // it is non-interactive while collapsed, and leaving ghosts always
  // are; `inert` states that for the tab order and the AT tree in one
  // place, while the CSS protocol keeps painting the same fact.
  const frontKey = useMemo(
    () => shown.findLast((toast) => toast.phase !== 'leaving')?.key,
    [shown]
  );

  const region = useRegion(presenter);
  const stack = useStack(shown, { visible });

  useVisibilityPause(presenter);

  return (
    <ol
      role="region"
      aria-label="Notifications"
      tabIndex={-1}
      data-cincin-toaster
      data-expanded={region.expanded}
      style={{ '--cincin-exit-duration': `${exitDuration}ms` } as CSSProperties}
      ref={region.ref}
      {...region.handlers}
    >
      {shown.map((toast) => (
        <ToastCard
          key={toast.key}
          toast={toast}
          presenter={presenter}
          swipeDirection={swipeDirection}
          inert={
            toast.phase === 'leaving' ||
            (!region.expanded && toast.key !== frontKey)
          }
          ref={stack.cardRef(toast.key)}
        />
      ))}
    </ol>
  );
}

type ToastCardProps = {
  toast: Toast<ToastContent>;
  presenter: Presenter<ToastContent>;
  swipeDirection: SwipeDirection;
  inert: boolean;
  ref?: Ref<HTMLLIElement>;
};

function ToastCard({
  toast,
  presenter,
  swipeDirection,
  inert,
  ref: forwardedRef,
}: ToastCardProps) {
  const { key, entry, phase } = toast;
  const swipeRef = useToastSwipe({
    key,
    presenter,
    direction: swipeDirection,
    enabled: entry.dismissible,
  });
  const composedRef = useComposedRefs(swipeRef, forwardedRef);

  const { title, description, action } = entry.content;

  return (
    <li
      role={
        entry.type === 'error' || entry.type === 'warning' ? 'alert' : 'status'
      }
      data-cincin-toast
      data-type={entry.type}
      data-phase={phase}
      data-dismissible={entry.dismissible}
      inert={inert}
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

        {action !== undefined && (
          <button
            type="button"
            data-cincin-action
            onClick={() => {
              action.onClick();
              presenter.dismiss(key);
            }}
          >
            {action.label}
          </button>
        )}

        {entry.dismissible && (
          <button
            type="button"
            data-cincin-close
            aria-label="Dismiss"
            onClick={() => presenter.dismiss(key)}
          >
            {CLOSE_ICON}
          </button>
        )}
      </div>
    </li>
  );
}

export { Toaster };
