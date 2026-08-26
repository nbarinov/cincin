import type { MouseEvent, ReactNode } from 'react';

type ToastContent = {
  title: ReactNode;
  description?: ReactNode;
  action?: {
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  };
};

export type { ToastContent };
