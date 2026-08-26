import { flingDuration } from './gesture';
import type { SwipeChannel } from './swipe-channel';
import { prefersReducedMotion, translateValue } from './utils';

interface FlingOptions {
  /** Initial slope of the fling easing; ties duration to hand speed. */
  slope: number;
  minDuration: number;
  maxDuration: number;
}

const CANCEL_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

// Both exits use the overlay pattern: the inline `translate` holds the
// rest target, the animation is a transient layer on top (no fill).
// When it ends, the computed value falls through to the inline target
// seamlessly. The exits never touch `transition`, so the skin's own
// transitions (stack movement, opacity) stay alive.

function flingOut(
  channel: SwipeChannel,
  from: number,
  velocity: number,
  options: FlingOptions,
  onComplete: () => void
): Animation | null {
  const target = channel.exitTarget();
  channel.set(target);

  if (prefersReducedMotion()) {
    onComplete();
    return null;
  }

  const duration = flingDuration(
    Math.abs(target - from),
    velocity,
    options.slope,
    options.minDuration,
    options.maxDuration
  );

  const animation = channel.element.animate(
    [
      { translate: translateValue(channel.axis, from) },
      { translate: translateValue(channel.axis, target) },
    ],
    {
      duration,
      easing: `cubic-bezier(${(1 / options.slope).toFixed(3)}, 1, 0.7, 1)`,
    }
  );

  animation.finished.then(onComplete, () => {
    // noop
  });

  return animation;
}

function springBack(
  channel: SwipeChannel,
  from: number,
  duration: number
): Animation | null {
  channel.set(0);

  if (prefersReducedMotion()) {
    return null;
  }

  return channel.element.animate(
    [
      { translate: translateValue(channel.axis, from) },
      { translate: translateValue(channel.axis, 0) },
    ],
    { duration, easing: CANCEL_EASING }
  );
}

export { flingOut, springBack };
export type { FlingOptions };
