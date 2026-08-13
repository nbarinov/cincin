// counters

function counter(initial = 0) {
  let count = initial;

  return () => ++count;
}

export { counter };

// dev warnings

interface RuntimeGlobals {
  console?: { warn(...args: unknown[]): void };
  process?: { env?: { NODE_ENV?: string } };
}

const runtime = globalThis as unknown as RuntimeGlobals;

export function devWarn(message: string, ...args: unknown[]): void {
  if (runtime.process?.env?.NODE_ENV === 'production') {
    return;
  }

  runtime.console?.warn(`[cincin] ${message}`, ...args);
}
