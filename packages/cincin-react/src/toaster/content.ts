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

type ToasterLabels = {
  /**
   * The region landmark's accessible name.
   *
   * @default 'Notifications'
   */
  region?: string;
  /**
   * The close buttons' accessible name.
   *
   * @default 'Dismiss'
   */
  close?: string;
};

export type { ToastAction, ToastContent, ToasterLabels };
