import type { Axis, Sign } from './types';

/**
 * Power-curve resistance for movement against the allowed direction.
 * Along the direction the movement is free; against it the offset is
 * compressed (iOS rubber-band feel), harder the further you pull.
 */
function dampen(raw: number, sign: Sign, damping: number): number {
  const along = raw * sign;

  if (along >= 0) {
    return raw;
  }

  return sign * -Math.pow(-along, damping);
}

type VelocitySample = {
  t: number;
  pos: number;
};

/**
 * Average velocity over the trailing window, px/ms, signed along the axis.
 * A two-sample delta is too noisy: pointer events arrive unevenly, so the
 * hand speed is measured across the last `windowMs` of movement instead.
 */
function trailingVelocity(
  samples: readonly VelocitySample[],
  windowMs: number
): number {
  if (samples.length < 2) {
    return 0;
  }

  const last = samples[samples.length - 1]!;
  const cutoff = last.t - windowMs;
  const first = samples.find((sample) => sample.t >= cutoff) ?? samples[0]!;
  const dt = last.t - first.t;

  return dt > 0 ? (last.pos - first.pos) / dt : 0;
}

/**
 * Fling duration that makes the animation start at the hand's speed.
 * An ease-out bezier with initial slope `slope` moves at
 * `slope * distance / duration` at t=0; equating that to the release
 * velocity gives the duration. Clamps guard the degenerate ends:
 * a violent flick must not teleport, a threshold-crawl must not drag on.
 */
function flingDuration(
  remaining: number,
  velocity: number,
  slope: number,
  min: number,
  max: number
): number {
  const duration = (slope * remaining) / Math.max(velocity, 0.05);

  return Math.min(max, Math.max(min, duration));
}

type SwipeDirection = 'right' | 'left' | 'up' | 'down';

const AXIS: Record<SwipeDirection, Axis> = {
  left: 'x',
  right: 'x',
  up: 'y',
  down: 'y',
};

const SIGN: Record<SwipeDirection, Sign> = {
  down: 1,
  right: 1,
  up: -1,
  left: -1,
};

/** The reverse of AXIS/SIGN: release names the actual travel. */
function directionFor(axis: Axis, sign: Sign): SwipeDirection {
  if (axis === 'x') {
    return sign === 1 ? 'right' : 'left';
  }

  return sign === 1 ? 'down' : 'up';
}

/** The allowed signs per axis; an absent axis is a foreign one. */
function axisSigns(
  directions: readonly SwipeDirection[]
): Partial<Record<Axis, Set<Sign>>> {
  const signs: Partial<Record<Axis, Set<Sign>>> = {};

  for (const direction of directions) {
    (signs[AXIS[direction]] ??= new Set()).add(SIGN[direction]);
  }

  return signs;
}

/** Mutable state of one in-flight gesture, owned by the swipe controller. */
interface Gesture {
  /** The contact being tracked, in the protocol's opaque id. */
  id: number;
  /** The grab anchor in pointer space: deltas, the lock geometry and
   * the velocity window all measure from here (the lock backdates its
   * anchor sample to `t`, so the window sees the whole hand movement,
   * not just the tail past the lock distance). */
  start: { x: number; y: number; t: number };
  /** Translate at grab time, in card space, both components (the axis
   * is not chosen yet): a re-grab during the cancel spring continues
   * from `base[axis]`. */
  base: { x: number; y: number };
  locked: boolean;
  /** The locked axis is one of ours. When false we step aside and let scrolling happen. */
  ours: boolean;
  /** The gesture's axis; meaningful once `ours`. */
  axis: Axis;
  /**
   * The anchor sample plus one per own-axis move, pruned to the trailing
   * velocity window. Two or more samples mean the toast actually moved.
   */
  samples: VelocitySample[];
}

export { AXIS, SIGN, directionFor, axisSigns, dampen, trailingVelocity, flingDuration };
export type { Gesture, SwipeDirection };
