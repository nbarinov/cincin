type ToastContent = {
  title: string;
  description?: string;
  actions?: [ToastAction] | [ToastAction, ToastAction];
  /** @default true */
  closeButton?: boolean;
};

type ToastAction = {
  label: string;
  onClick: (event: MouseEvent) => void;
  /** @default 'primary' */
  variant?: 'primary' | 'secondary';
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

export type { ToastContent, ToastAction, ToasterLabels };
