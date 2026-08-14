import { dampen, trailingVelocity } from './gesture';
import type { Gesture, SwipeDirection } from './gesture';
import { createSwipeChannel } from './swipe-channel';
import { flingOut, springBack } from './swipe-exits';

type SwipeOptions = {
  /** Physical swipe direction. @default 'right' */
  direction?: SwipeDirection;
  /** Successful release. Map to `toaster.dismiss(id)`. */
  onDismiss: () => void;
  /**
   * The fling finished, the toast is fully off screen. Map to
   * `toaster.remove(id)`. The core safety net still guards a fling
   * that never finishes (a detached controller, a dropped frame).
   */
  onRemove: () => void;

  drag?: {
    /** Travel in px before the gesture axis is locked. @default 7 */
    lockDistance?: number;
    /** Power of the resistance curve against the direction. @default 0.7 */
    damping?: number;
  };
  dismiss?: {
    /** Offset in px past which a release dismisses. @default 45 */
    distance?: number;
    /** Release velocity in px/ms past which a flick dismisses. @default 0.11 */
    velocity?: number;
    /** Trailing window for velocity measurement, ms. @default 80 */
    velocityWindow?: number;
  };
  fling?: {
    /** @default 150 */
    minDuration?: number;
    /** @default 450 */
    maxDuration?: number;
    /**
     * Initial slope of the fling easing; ties duration to hand speed.
     * Clamped to >= 1 so the easing stays a valid bezier. @default 3
     */
    slope?: number;
  };
  cancel?: {
    /** Spring-back duration, ms. @default 300 */
    duration?: number;
  };
};

const DEFAULTS = {
  direction: 'right',
  drag: { lockDistance: 7, damping: 0.7 },
  dismiss: { distance: 45, velocity: 0.11, velocityWindow: 80 },
  fling: { minDuration: 150, maxDuration: 450, slope: 3 },
  cancel: { duration: 300 },
} as const;

function attachSwipe(element: HTMLElement, options: SwipeOptions): () => void {
  const { direction, drag, dismiss, fling, cancel } = resolveOptions(options);

  // The channel owns every style claim (touch-action, translate rest
  // position, the protocol variable) and returns them on release().
  const channel = createSwipeChannel(element, direction);
  const { axis, sign } = channel;

  let gesture: Gesture | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || gesture !== null) {
      return;
    }

    element.setPointerCapture(event.pointerId);
    // A running spring is a transient overlay animation: read the visual
    // position first, pin it inline, then kill the overlay. Order matters,
    // otherwise the element snaps to its rest target for one frame.
    const base = channel.read();
    channel.set(base);
    element.getAnimations().forEach((animation) => animation.cancel());

    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      base,
      locked: false,
      ours: false,
      offset: base,
      moved: false,
      samples: [{ t: performance.now(), pos: base }],
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (gesture?.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.locked) {
      if (Math.hypot(dx, dy) < drag.lockDistance) {
        return;
      }

      gesture.locked = true;
      gesture.ours = Math.abs(dx) >= Math.abs(dy) === (axis === 'x');

      if (gesture.ours) {
        element.setAttribute('data-swiping', 'true');
      }
    }

    if (!gesture.ours) {
      // A foreign-axis gesture: native scrolling does its thing.
      return;
    }

    const now = performance.now();
    const raw = (axis === 'x' ? dx : dy) + gesture.base;
    const offset = dampen(raw, sign, drag.damping);

    gesture.offset = offset;
    gesture.moved = true;
    gesture.samples.push({ t: now, pos: offset });

    // Keep only the trailing velocity window; the sample right before the
    // cutoff stays so the window is always fully covered.
    const cutoff = now - dismiss.velocityWindow;
    while (gesture.samples.length > 2 && gesture.samples.at(1)!.t < cutoff) {
      gesture.samples.shift();
    }

    channel.set(offset);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (gesture?.pointerId !== event.pointerId) {
      return;
    }

    const g = gesture;
    gesture = null;
    element.removeAttribute('data-swiping');

    if (!g.moved || !g.ours) {
      // A tap: let the click through untouched.
      return;
    }

    suppressNextClick(element);

    const velocity = trailingVelocity(g.samples, dismiss.velocityWindow) * sign;
    const distance = g.offset * sign;
    const passed =
      event.type !== 'pointercancel' &&
      (distance > dismiss.distance || velocity > dismiss.velocity);

    if (!passed) {
      springBack(channel, g.offset, cancel.duration);
      return;
    }

    // The fling owns the exit: skins must not play their CSS exit
    // animation while data-swipe-direction is present.
    element.setAttribute('data-swipe-direction', direction);
    options.onDismiss();
    flingOut(
      channel,
      g.offset,
      Math.max(velocity, 0),
      {
        slope: fling.slope,
        duration: { min: fling.minDuration, max: fling.maxDuration },
      },
      options.onRemove
    );
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerUp);
    element.getAnimations().forEach((animation) => animation.cancel());
    // One call returns every claimed channel to its pre-attach state.
    channel.release();
    // data-swipe-direction stays: it is the protocol signal for the
    // departure phase and the element is leaving the DOM anyway.
  };
}

export { attachSwipe };
export type { SwipeOptions, SwipeDirection };

// utils

type DeepRequired<T> = T extends (...args: never) => unknown
  ? T
  : T extends object
    ? { [P in keyof T]-?: DeepRequired<T[P]> }
    : T;

function resolveOptions(options: SwipeOptions): DeepRequired<SwipeOptions> {
  const fling = { ...DEFAULTS.fling, ...options.fling };
  fling.slope = Math.max(fling.slope, 1);

  return {
    ...DEFAULTS,
    ...options,
    drag: { ...DEFAULTS.drag, ...options.drag },
    dismiss: { ...DEFAULTS.dismiss, ...options.dismiss },
    fling,
    cancel: { ...DEFAULTS.cancel, ...options.cancel },
  };
}

/**
 * After a drag the browser still synthesizes a click; without suppression
 * a swipe would also "press" whatever action sits under the finger.
 */
function suppressNextClick(element: HTMLElement): void {
  const swallow = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();

    clearTimeout(timeout);
  };

  element.addEventListener('click', swallow, { capture: true, once: true });

  const timeout = setTimeout(() => {
    element.removeEventListener('click', swallow, { capture: true });
  }, 400);
}
