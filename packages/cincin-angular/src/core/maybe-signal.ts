/**
 * A value or a getter of one: the Angular spelling of Vue's
 * MaybeRefOrGetter. Static callers pass the value, reactive callers
 * pass a signal or any getter, and `read` reads either (tracked when
 * called in a reactive context).
 */
type MaybeSignal<T> = T | (() => T);

function read<T>(value: MaybeSignal<T>): T {
  return typeof value === 'function' ? (value as () => T)() : value;
}

export { read };
export type { MaybeSignal };
