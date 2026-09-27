import type { ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import type { Framework as FrameworkName } from '@/content/frameworks';

type FrameworkProps = {
  name: FrameworkName;
  children: ReactNode;
};

function Framework({ name, children }: FrameworkProps) {
  const current = useParams({
    strict: false,
    select: (params) => params.framework,
  });

  if (name !== current) {
    return null;
  }

  return children;
}

export { Framework };
