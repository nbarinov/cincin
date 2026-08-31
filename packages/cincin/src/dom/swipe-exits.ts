import { flingDuration } from './gesture';
import type { SwipeChannel } from './swipe-channel';
import type { Axis, Sign } from './types';
import { prefersReducedMotion, translateValue } from './utils';

interface FlingOptions {
  /** Initial slope of the fling easing; ties duration to hand speed. */
  slope: number;
  minDuration: number;
  maxDuration: number;
}

function flingOut(
  channel: SwipeChannel,
  axis: Axis,
  sign: Sign,
  from: number,
  velocity: number,
  options: FlingOptions,
  onComplete: () => void
): Animation | null {
  const target = channel.exitTarget(axis, sign, from);
  const animation = overlay(channel, axis, from, target, {
    duration: flingDuration(
      Math.abs(target - from),
      velocity,
      options.slope,
      options.minDuration,
      options.maxDuration
    ),
    easing: `cubic-bezier(${(1 / options.slope).toFixed(3)}, 1, 0.7, 1)`,
  });

  if (animation === null) {
    onComplete();
    return null;
  }

  animation.finished.then(onComplete, () => {
    // noop
  });

  return animation;
}

function springBack(
  channel: SwipeChannel,
  axis: Axis,
  from: number,
  duration: number
): Animation | null {
  return overlay(channel, axis, from, 0, {
    duration,
    easing: CANCEL_EASING,
  });
}

export { flingOut, springBack };
export type { FlingOptions };

// utils

const CANCEL_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * The overlay move both exits are made of: the inline `translate`
 * jumps to the target, the animation replays the travel as a transient
 * layer on top (no fill), and when it ends the computed value falls
 * through to the inline target seamlessly. Under reduced motion only
 * the jump remains (null). The move never touches `transition`, so the
 * skin's own transitions (stack movement, opacity) stay alive.
 */
function overlay(
  channel: SwipeChannel,
  axis: Axis,
  from: number,
  target: number,
  timing: { duration: number; easing: string }
): Animation | null {
  channel.set(axis, target);

  if (prefersReducedMotion()) {
    return null;
  }

  return channel.element.animate(
    [
      { translate: translateValue(axis, from) },
      { translate: translateValue(axis, target) },
    ],
    timing
  );
}
