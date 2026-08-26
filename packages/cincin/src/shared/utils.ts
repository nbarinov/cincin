// counters

function counter(initial = 0) {
  let count = initial;

  return () => ++count;
}

// equality

/** Shallow equality over plain objects and primitives: `Object.is` on
 * the values, one level deep. Enough for slot objects and selected
 * derivations; not a deep compare. */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  return (
    keysA.length === keysB.length &&
    keysA.every((key) =>
      Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    )
  );
}

// dev warnings

function devWarn(message: string, ...args: unknown[]): void {
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

export { shallowEqual, devWarn, counter };
