import { dampen, trailingVelocity } from './gesture';
import type { Gesture, SwipeDirection } from './gesture';
import { createSwipeChannel } from './swipe-channel';
import { flingOut, springBack } from './swipe-exits';
import type { FlingConfig } from './swipe-exits';

type SwipeOptions = {
  /** Physical swipe direction. @default 'right' */
  direction?: SwipeDirection;
  /** Successful release. Map to `presenter.dismiss(key)`. */
  onDismiss: () => void;
  /**
   * The fling finished, the toast is fully off screen. Map to
   * `presenter.finish(key)`. The presenter's exit clock still guards a
   * fling that never finishes (a detached controller, a dropped frame).
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

  const controller = new AbortController();

  // The channel owns every style and protocol claim (touch-action, the
  // translate rest position, the variable, the data attributes) and
  // returns the transient ones on release().
  const channel = createSwipeChannel(element, direction);
  const { axis, sign } = channel;

  let gesture: Gesture | null = null;
  // The one overlay animation this controller owns (spring or fling).
  // Cancelling is scoped to it: skin animations are out of reach.
  let overlay: Animation | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || gesture !== null || channel.exiting()) {
      return;
    }

    // A running spring is a transient overlay animation: read the visual
    // position first, pin it inline, then kill the overlay. Order matters,
    // otherwise the element snaps to its rest target for one frame.
    const base = channel.read();
    channel.set(base);
    overlay?.cancel();

    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      base,
      locked: false,
      ours: false,
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
        // Capture only once the drag is real: pointer capture retargets
        // even the compatibility click, so capturing on pointerdown would
        // steal taps from the toast's interactive children.
        element.setPointerCapture(event.pointerId);
        channel.markSwiping(true);
      }
    }

    if (!gesture.ours) {
      // A foreign-axis gesture: native scrolling does its thing.
      return;
    }

    const now = performance.now();
    const raw = (axis === 'x' ? dx : dy) + gesture.base;
    const offset = dampen(raw, sign, drag.damping);

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
    channel.markSwiping(false);

    if (g.samples.length < 2) {
      // Never moved along our axis: a tap, or a foreign-axis gesture.
      return;
    }

    const offset = g.samples.at(-1)!.pos;

    // pointercancel never synthesizes a click: arming the suppression
    // there would eat the user's next legitimate tap instead.
    if (event.type !== 'pointercancel') {
      suppressNextClick(element, { signal: controller.signal });
    }

    const velocity = trailingVelocity(g.samples, dismiss.velocityWindow) * sign;
    const distance = offset * sign;
    const passed =
      event.type !== 'pointercancel' &&
      (distance > dismiss.distance || velocity > dismiss.velocity);

    if (!passed) {
      overlay = springBack(channel, offset, cancel.duration);
      return;
    }

    // The fling owns the exit: skins must not play their CSS exit
    // animation while data-swipe-direction is present.
    channel.markExit();
    options.onDismiss();
    overlay = flingOut(
      channel,
      offset,
      Math.max(velocity, 0),
      fling,
      options.onRemove
    );
  };

  element.addEventListener('pointerdown', onPointerDown, {
    signal: controller.signal,
  });
  element.addEventListener('pointermove', onPointerMove, {
    signal: controller.signal,
  });
  element.addEventListener('pointerup', onPointerUp, {
    signal: controller.signal,
  });
  element.addEventListener('pointercancel', onPointerUp, {
    signal: controller.signal,
  });

  return () => {
    controller.abort();
    overlay?.cancel();
    // One call returns every claimed channel to its pre-attach state.
    channel.release();
  };
}

export { attachSwipe };
export type { SwipeOptions, SwipeDirection };

// utils

interface ResolvedOptions {
  direction: SwipeDirection;
  onDismiss: () => void;
  onRemove: () => void;
  drag: Required<NonNullable<SwipeOptions['drag']>>;
  dismiss: Required<NonNullable<SwipeOptions['dismiss']>>;
  fling: FlingConfig;
  cancel: Required<NonNullable<SwipeOptions['cancel']>>;
}

function resolveOptions(options: SwipeOptions): ResolvedOptions {
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
function suppressNextClick(
  element: HTMLElement,
  { signal }: { signal: AbortSignal }
): void {
  element.addEventListener(
    'click',
    (event) => {
      event.stopImmediatePropagation();
      event.preventDefault();
    },
    {
      capture: true,
      once: true,
      signal: AbortSignal.any([AbortSignal.timeout(400), signal]),
    }
  );
}
