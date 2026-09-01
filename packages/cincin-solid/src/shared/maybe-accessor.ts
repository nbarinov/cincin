import type { Accessor } from 'solid-js';

/** A value or an accessor of one: the Solid spelling of Vue's
 * MaybeRefOrGetter. Static callers pass the value, reactive callers
 * pass a getter, and `access` reads either (tracked when called in a
 * tracked scope). */
type MaybeAccessor<T> = T | Accessor<T>;

function access<T>(value: MaybeAccessor<T> | undefined): T | undefined {
  return typeof value === 'function' ? (value as Accessor<T>)() : value;
}

export { access };
export type { MaybeAccessor };
