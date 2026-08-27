import type { MouseEvent, ReactNode } from 'react';

type ToastAction = {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  /** @default 'primary' */
  variant?: 'primary' | 'secondary';
};

type ToastContent = {
  title: ReactNode;
  description?: ReactNode;
  actions?: [ToastAction] | [ToastAction, ToastAction];
  /** @default true */
  closeButton?: boolean;
};

export type { ToastAction, ToastContent };
