import type { JSX } from 'solid-js';

type ToastAction = {
  label: string;
  onClick: (event: MouseEvent) => void;
  /** @default 'primary' */
  variant?: 'primary' | 'secondary';
};

type ToastContent = {
  title: JSX.Element;
  description?: JSX.Element;
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
