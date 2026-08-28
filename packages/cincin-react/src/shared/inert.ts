import { version } from 'react';

const REACT_MAJOR = Number(version.split('.')[0]);

/**
 * The `inert` value for the running React. React 19 knows the boolean
 * prop; React 18 renders `inert` as an unknown attribute, drops
 * booleans with a warning, and takes an empty string for on,
 * `undefined` for off. An empty string is falsy on 19, so no single
 * value serves both majors: the helper picks by version, the way
 * sonner and radix do.
 */
function inertValue(
  value: boolean,
  major: number = REACT_MAJOR
): boolean | undefined {
  if (major >= 19) {
    return value;
  }

  return value ? ('' as unknown as boolean) : undefined;
}

export { inertValue };
