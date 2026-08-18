'use client';

import type { Toaster as ToasterContract, Toast } from 'cincin';
import type { SwipeDirection } from 'cincin/dom';
import { useMemo } from 'react';
import type { Ref } from 'react';
import { useComposedRefs } from '../shared/use-composed-refs';
import { useToastSwipe } from '../core/use-toast-swipe';
import { useToastExit } from '../core/use-toast-exit';
import type { ToastContent } from './content';
import { toast as defaultToaster } from './toast';
import { useStack } from './use-stack';
import { useRegion } from './use-region';
import { CLOSE_ICON, TYPE_ICONS } from './icons';
import { useToasts } from '../core/use-toasts';

type ToasterProps = {
  /** @default the package singleton */
  toaster?: ToasterContract<ToastContent>;
  /** @default 'right' */
  swipeDirection?: SwipeDirection;
  /** @default 3 */
  visible?: number;
};

function Toaster({
  toaster = defaultToaster,
  swipeDirection = 'right',
  visible = 3,
}: ToasterProps) {
  const toasts = useToasts(toaster);
  const visibleToasts = useMemo(
    () => toasts.filter((item) => item.status !== 'queued'),
    [toasts]
  );

  const region = useRegion(toaster);
  const stack = useStack(visibleToasts, { visible });

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
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          toaster={toaster}
          swipeDirection={swipeDirection}
          ref={stack.measureRef(toast.id)}
        />
      ))}
    </ol>
  );
}

type ToastProps = {
  toast: Toast<ToastContent>;
  toaster: ToasterContract<ToastContent>;
  swipeDirection: SwipeDirection;
  ref?: Ref<HTMLLIElement>;
};

function Toast({
  toast,
  toaster,
  swipeDirection,
  ref: forwardedRef,
}: ToastProps) {
  const onExitToast = useToastExit(toast.id, toaster);
  const swipeRef = useToastSwipe(toast.id, toaster, {
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
      data-status={toast.status}
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
            toaster.dismiss(toast.id);
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
          onClick={() => toaster.dismiss(toast.id)}
        >
          {CLOSE_ICON}
        </button>
      )}
    </li>
  );
}

export { Toaster };
