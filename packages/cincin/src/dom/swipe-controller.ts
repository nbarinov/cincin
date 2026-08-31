import { devWarn } from '../shared/utils';
import { axisSigns, dampen, directionFor, trailingVelocity } from './gesture';
import type { Gesture, SwipeDirection } from './gesture';
import { createSwipeChannel } from './swipe-channel';
import type { SwipeChannel } from './swipe-channel';
import { flingOut, springBack } from './swipe-exits';
import type { FlingOptions } from './swipe-exits';
import type { Axis, Sign } from './types';

type SwipeOptions = {
  /** Directions a swipe may dismiss along. @default ['right', 'down'] */
  directions?: readonly SwipeDirection[];
  onDismiss: () => void;
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
     * Clamped to >= 1 so the easing stays a valid bezier.
     *
     * @default 3
     */
    slope?: number;
  };
  cancel?: {
    /** Spring-back duration, ms. @default 300 */
    duration?: number;
  };
};

type SwipeTuning = Pick<SwipeOptions, 'drag' | 'dismiss' | 'fling' | 'cancel'>;

type SwipePoint = { id: number; x: number; y: number };

/**
 * How a release concluded: a 'drag' really moved the card, so the
 * browser will synthesize a trailing click for the adapter to gate;
 * a 'tap' never moved and keeps its click.
 */
type SwipeRelease = 'tap' | 'drag';

const DEFAULTS = {
  directions: ['right', 'down'],
  drag: { lockDistance: 7, damping: 0.7 },
  dismiss: { distance: 45, velocity: 0.11, velocityWindow: 80 },
  fling: { minDuration: 150, maxDuration: 450, slope: 3 },
  cancel: { duration: 300 },
} as const;

/**
 * The swipe gesture machine. Inputs are semantic (`start`, `move`,
 * `release`, `cancel` with plain points), never DOM events: adapters
 * translate their event systems into the protocol, each in its own
 * idiom (`attachSwipe` for native listeners, the React hook for
 * synthetic handlers). Outputs are the DOM effects the machine owns as
 * a controller: the style channel, pointer capture, and the overlay
 * exit animations. The channel is lazy: it binds to the element of the
 * first `start` (and rebinds on a node swap), so a controller that is
 * never touched claims nothing.
 *
 * The gesture's axis is chosen at the lock by dominance, among the
 * axes the directions allow; the committed direction is the actual
 * travel, decided at release from the offset's sign.
 */
class SwipeController {
  #options: ResolvedOptions;
  #signs: Partial<Record<Axis, Set<Sign>>>;
  #channel: SwipeChannel | null = null;
  #gesture: Gesture | null = null;
  #overlay: Animation | null = null;

  constructor(options: SwipeOptions) {
    this.#options = resolveOptions(options);
    this.#signs = axisSigns(this.#options.directions);

    if (this.#options.directions.length === 0) {
      devWarn(
        'swipe: `directions` is empty, so every gesture is foreign; omit the option to get the default'
      );
    }
  }

  get directions(): readonly SwipeDirection[] {
    return this.#options.directions;
  }

  setOptions(tuning: SwipeTuning): void {
    const fling = { ...this.#options.fling, ...tuning.fling };
    fling.slope = Math.max(fling.slope, 1);

    this.#options = {
      ...this.#options,
      drag: { ...this.#options.drag, ...tuning.drag },
      dismiss: { ...this.#options.dismiss, ...tuning.dismiss },
      fling,
      cancel: { ...this.#options.cancel, ...tuning.cancel },
    };
  }

  start(element: HTMLElement, point: SwipePoint): void {
    if (this.#gesture !== null || this.#channel?.exiting()) {
      return;
    }

    this.#bind(element);

    // Pin before cancelling the overlay: the pin reads the computed
    // mid-animation value, which the cancel would snap away.
    const [baseX, baseY] = this.#channel!.pin();
    this.#overlay?.cancel();

    this.#gesture = {
      id: point.id,
      start: { x: point.x, y: point.y, t: performance.now() },
      base: { x: baseX, y: baseY },
      locked: false,
      ours: false,
      axis: 'x',
      samples: [],
    };
  }

  move(point: SwipePoint): void {
    const gesture = this.#gesture;
    if (gesture?.id !== point.id) {
      return;
    }

    const channel = this.#channel!;
    const { drag, dismiss } = this.#options;
    const dx = point.x - gesture.start.x;
    const dy = point.y - gesture.start.y;

    if (!gesture.locked) {
      if (Math.hypot(dx, dy) < drag.lockDistance) {
        return;
      }

      gesture.locked = true;
      const axis: Axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      gesture.ours = this.#signs[axis] !== undefined;

      if (gesture.ours) {
        // A cross-axis re-grab forfeits the other component's pinned
        // remainder: the first set() below zeroes it (see the channel).
        gesture.axis = axis;
        gesture.samples.push({ t: gesture.start.t, pos: gesture.base[axis] });

        // Capture only once the drag is real: pointer capture retargets
        // even the compatibility click, so capturing on the first touch
        // would steal taps from the toast's interactive children.
        channel.element.setPointerCapture(point.id);
        channel.markSwiping(true);
      }
    }

    if (!gesture.ours) {
      // A foreign-axis gesture: native scrolling does its thing.
      return;
    }

    const now = performance.now();
    const signs = this.#signs[gesture.axis]!;
    const raw = (gesture.axis === 'x' ? dx : dy) + gesture.base[gesture.axis];
    // Both signs allowed: the axis is free, there is no "against" to
    // resist. One sign: the power curve pushes back the other way.
    const offset =
      signs.size === 2
        ? raw
        : dampen(raw, signs.values().next().value!, drag.damping);

    gesture.samples.push({ t: now, pos: offset });

    // Keep only the trailing velocity window; the sample right before the
    // cutoff stays so the window is always fully covered.
    const cutoff = now - dismiss.velocityWindow;
    while (gesture.samples.length > 2 && gesture.samples.at(1)!.t < cutoff) {
      gesture.samples.shift();
    }

    channel.set(gesture.axis, offset);
  }

  release(point: SwipePoint): SwipeRelease {
    const gesture = this.#settle(point);
    if (gesture === null) {
      return 'tap';
    }

    const channel = this.#channel!;
    const { dismiss, fling, cancel } = this.#options;
    const offset = gesture.samples.at(-1)!.pos;

    if (offset === 0) {
      this.#overlay = springBack(channel, gesture.axis, 0, cancel.duration);
      return 'drag';
    }

    // The samples end at the last move, but the hand may have rested
    // since: a settle sample at release time lets the trailing window
    // see the stillness, so a paused drag decays toward zero velocity
    // instead of keeping the speed of its last burst forever.
    gesture.samples.push({ t: performance.now(), pos: offset });

    // The candidate direction is where the card actually sits; the
    // velocity counts only when it agrees with it (an inward flick
    // reads as "changed my mind", not as a dismissal the other way).
    const sign: Sign = offset > 0 ? 1 : -1;
    const velocity =
      trailingVelocity(gesture.samples, dismiss.velocityWindow) * sign;
    const passed =
      this.#signs[gesture.axis]!.has(sign) &&
      (offset * sign > dismiss.distance || velocity > dismiss.velocity);

    if (!passed) {
      this.#overlay = springBack(
        channel,
        gesture.axis,
        offset,
        cancel.duration
      );
      return 'drag';
    }

    // The fling owns the exit: skins must not play their CSS exit
    // animation while data-swipe-direction is present.
    channel.markExit(directionFor(gesture.axis, sign));
    this.#options.onDismiss();
    this.#overlay = flingOut(
      channel,
      gesture.axis,
      sign,
      offset,
      Math.max(velocity, 0),
      fling,
      this.#options.onRemove
    );

    return 'drag';
  }

  cancel(point: SwipePoint): void {
    const gesture = this.#settle(point);
    if (gesture === null) {
      return;
    }

    this.#overlay = springBack(
      this.#channel!,
      gesture.axis,
      gesture.samples.at(-1)!.pos,
      this.#options.cancel.duration
    );
  }

  destroy(): void {
    this.#gesture = null;
    this.#overlay?.cancel();
    // One call returns every claimed channel to its pre-bind state.
    this.#channel?.release();
    this.#channel = null;
  }

  /** Ends the tracked gesture for a matching contact; null when there
   * is nothing to fling or spring on its own (a foreign contact, or a
   * contact that never moved along our axes: a tap, or a foreign-axis
   * gesture). */
  #settle(point: SwipePoint): Gesture | null {
    if (this.#gesture?.id !== point.id) {
      return null;
    }

    const gesture = this.#gesture;
    this.#gesture = null;
    this.#channel!.markSwiping(false);

    if (gesture.samples.length < 2) {
      this.#settlePin(gesture);
      return null;
    }

    return gesture;
  }

  /** A grab that caught the cancel spring mid-flight pinned its offset;
   * when it then ends without a drag (a tap, a foreign-axis gesture),
   * nothing downstream would move the card, so the pinned remainder is
   * sent home here or it would hang forever. */
  #settlePin(gesture: Gesture): void {
    const axis: Axis = gesture.base.x !== 0 ? 'x' : 'y';
    const from = gesture.base[axis];

    if (from !== 0) {
      this.#overlay = springBack(
        this.#channel!,
        axis,
        from,
        this.#options.cancel.duration
      );
    }
  }

  #bind(element: HTMLElement): void {
    if (this.#channel?.element === element) {
      return;
    }

    this.#overlay?.cancel();
    this.#channel?.release();
    this.#channel = createSwipeChannel(element, this.#options.directions);
  }
}

function createSwipeController(options: SwipeOptions): SwipeController {
  return new SwipeController(options);
}

export { createSwipeController, SwipeController };
export type { SwipeOptions, SwipeTuning, SwipePoint, SwipeRelease };

// utils

interface ResolvedOptions {
  directions: readonly SwipeDirection[];
  onDismiss: () => void;
  onRemove: () => void;
  drag: Required<NonNullable<SwipeOptions['drag']>>;
  dismiss: Required<NonNullable<SwipeOptions['dismiss']>>;
  fling: FlingOptions;
  cancel: Required<NonNullable<SwipeOptions['cancel']>>;
}

function resolveOptions(options: SwipeOptions): ResolvedOptions {
  const fling = { ...DEFAULTS.fling, ...options.fling };
  fling.slope = Math.max(fling.slope, 1);

  return {
    ...DEFAULTS,
    ...options,
    directions: options.directions ?? DEFAULTS.directions,
    drag: { ...DEFAULTS.drag, ...options.drag },
    dismiss: { ...DEFAULTS.dismiss, ...options.dismiss },
    fling,
    cancel: { ...DEFAULTS.cancel, ...options.cancel },
  };
}
