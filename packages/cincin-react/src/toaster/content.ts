import type { ReactNode } from 'react';

type ToastContent = {
  title: ReactNode;
  description?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type { ToastContent };
