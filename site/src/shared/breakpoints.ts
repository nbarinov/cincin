import breakpoints from '@/styles/breakpoints.module.css';
import { useMediaQuery } from './media-query';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg';

const BREAKPOINTS: Record<Breakpoint, string> = {
  xs: read('xs'),
  sm: read('sm'),
  md: read('md'),
  lg: read('lg'),
};

function useBreakpoint(name: Breakpoint): boolean | undefined {
  return useMediaQuery(BREAKPOINTS[name]);
}

export { useBreakpoint };
export type { Breakpoint };

// utils

function read(name: Breakpoint): string {
  const query = breakpoints[name];

  if (query === undefined) {
    throw new Error(`breakpoints.module.css has no @value ${name}`);
  }

  return query;
}
