// counters

function counter(initial = 0) {
  let count = initial;

  return () => ++count;
}

export { counter };

// dev warnings

export function devWarn(message: string, ...args: unknown[]): void {
  // `process` exists in Node and under bundlers that define it, not in
  // a bare browser: the typeof guard keeps the read from throwing there.
  if (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV === 'production'
  ) {
    return;
  }

  console.warn(`[cincin] ${message}`, ...args);
}
