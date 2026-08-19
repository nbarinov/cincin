'use client';

import type { Toaster as ToasterContract, Toast } from 'cincin';
import type { SwipeDirection } from 'cincin/dom';
import type { Presentation, Presenter } from 'cincin/presenter';
import { useMemo } from 'react';
import type { Ref } from 'react';
import { useComposedRefs } from '../shared/use-composed-refs';
import { usePresenter } from '../core/use-presenter';
import { usePresentations } from '../core/use-presentations';
import { useToastSwipe } from '../core/use-toast-swipe';
import { useToastExit } from '../core/use-toast-exit';
import type { ToastContent } from './content';
import { toast as defaultToaster } from './toast';
import { useStack } from './use-stack';
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
};

function Toaster({
  toaster = defaultToaster,
  swipeDirection = 'right',
  visible = 3,
  max = Infinity,
}: ToasterProps) {
  const presenter = usePresenter(toaster, { max });
  const presentations = usePresentations(presenter);
  const shown = useMemo(
    () => presentations.filter((p) => p.phase !== 'queued'),
    [presentations]
  );

  const region = useRegion(presenter);
  const stack = useStack(shown, { visible });

  return (
    <ol
      role="region"
      aria-label="Notifications"
      tabIndex={-1}
      data-cincin-toaster
      data-expanded={region.expanded}
      ref={region.ref}
      {...region.handlers}
    >
      {shown.map((p) => (
        <Toast
          key={p.key}
          presentation={p}
          presenter={presenter}
          swipeDirection={swipeDirection}
          ref={stack.measureRef(p.key)}
        />
      ))}
    </ol>
  );
}

type ToastProps = {
  presentation: Presentation<ToastContent>;
  presenter: Presenter<ToastContent>;
  swipeDirection: SwipeDirection;
  ref?: Ref<HTMLLIElement>;
};

function Toast({
  presentation,
  presenter,
  swipeDirection,
  ref: forwardedRef,
}: ToastProps) {
  const { key, toast, phase } = presentation;
  const onExitToast = useToastExit(key, presenter);
  const swipeRef = useToastSwipe(key, presenter, {
    direction: swipeDirection,
    enabled: toast.dismissible,
  });
  const composedRef = useComposedRefs(swipeRef, forwardedRef);

  const { title, description, action } = toast.content;

  return (
    <li
      role={
        toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'
      }
      data-cincin-toast
      data-type={toast.type}
      data-phase={phase}
      data-dismissible={toast.dismissible}
      ref={composedRef}
      onTransitionEnd={onExitToast}
    >
      {TYPE_ICONS[toast.type]}

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

      {toast.dismissible && (
        <button
          type="button"
          data-cincin-close
          aria-label="Dismiss"
          onClick={() => presenter.dismiss(key)}
        >
          {CLOSE_ICON}
        </button>
      )}
    </li>
  );
}

export { Toaster };
