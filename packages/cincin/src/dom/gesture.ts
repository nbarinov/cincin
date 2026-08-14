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

/** Mutable state of one in-flight gesture, owned by the swipe controller. */
interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  /** Translate at grab time: a re-grab during the cancel spring continues from there. */
  base: number;
  locked: boolean;
  /** The locked axis matches ours. When false we step aside and let scrolling happen. */
  ours: boolean;
  /**
   * The grab sample plus one per own-axis move, pruned to the trailing
   * velocity window. Two or more samples mean the toast actually moved.
   */
  samples: VelocitySample[];
}

export { AXIS, SIGN, dampen, trailingVelocity, flingDuration };
export type { Gesture, SwipeDirection };
