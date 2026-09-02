import type { ComponentChildren } from 'preact';

type ToastAction = {
  label: string;
  /** The native click; `preventDefault` keeps the toast. */
  onClick: (event: MouseEvent) => void;
  /** @default 'primary' */
  variant?: 'primary' | 'secondary';
};

type ToastContent = {
  title: ComponentChildren;
  description?: ComponentChildren;
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
