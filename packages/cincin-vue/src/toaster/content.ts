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

export type { ToastContent, ToastAction };
