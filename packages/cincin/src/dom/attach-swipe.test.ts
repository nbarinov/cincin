import { attachSwipe } from './attach-swipe';
import { makeElement } from './test-helpers';

function firePointer(
  element: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number
): void {
  element.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      bubbles: true,
      clientX: x,
      clientY: y,
    })
  );
}

/** Drives a gesture with controlled timing so velocity is predictable. */
function drag(
  element: HTMLElement,
  path: Array<[x: number, y: number, advanceMs: number]>,
  finalType: 'pointerup' | 'pointercancel' = 'pointerup'
): void {
  firePointer(element, 'pointerdown', 0, 0);

  let lastX = 0;
  let lastY = 0;
  for (const [x, y, advanceMs] of path) {
    vi.advanceTimersByTime(advanceMs);
    firePointer(element, 'pointermove', x, y);
    lastX = x;
    lastY = y;
  }

  firePointer(element, finalType, lastX, lastY);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('attachSwipe', () => {
  it('should claim touch-action on attach and restore it on detach', () => {
    const element = makeElement();
    element.style.touchAction = 'auto';

    // The mixed default claims both axes; scrolling over the card dies.
    const detach = attachSwipe(element, {
      onDismiss: () => {},
      onRemove: () => {},
    });
    expect(element.style.touchAction).toBe('none');

    detach();
    expect(element.style.touchAction).toBe('auto');
    expect(element.style.translate).toBe('');
  });

  it('should reserve the cross axis for a single-axis set', () => {
    const element = makeElement();
    attachSwipe(element, {
      directions: ['right'],
      onDismiss: () => {},
      onRemove: () => {},
    });

    expect(element.style.touchAction).toBe('pan-y');
  });

  it('should mark data-swiping and move the element once the gesture locks', () => {
    const element = makeElement();
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    firePointer(element, 'pointerdown', 0, 0);
    vi.advanceTimersByTime(50);
    firePointer(element, 'pointermove', 10, 2);

    expect(element.getAttribute('data-swiping')).toBe('true');
    expect(element.style.translate).toBe('10px 0px');
    expect(element.style.getPropertyValue('--cincin-swipe-x')).toBe('10px');
  });

  it('should step aside for a foreign-axis gesture', () => {
    const element = makeElement();
    attachSwipe(element, {
      // The default set owns both axes; the foreign-axis branch needs
      // a set that leaves the vertical one to the browser.
      directions: ['right'],
      onDismiss: () => {},
      onRemove: () => {},
    });

    firePointer(element, 'pointerdown', 0, 0);
    vi.advanceTimersByTime(50);
    firePointer(element, 'pointermove', 2, 20);

    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.style.translate).toBe('0px 0px'); // rest claim, untouched
  });

  it('should spring back below both thresholds', () => {
    const element = makeElement();
    const onDismiss = vi.fn();
    const animate = vi.spyOn(Element.prototype, 'animate');
    attachSwipe(element, { onDismiss, onRemove: () => {} });

    // 20px total: distance misses the 45px gate, and the trailing 80ms
    // window holds only the release sample, so velocity reads 0.
    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.style.translate).toBe('0px 0px'); // spring rest target
    expect(animate).toHaveBeenCalledTimes(1); // the spring overlay
    expect(animate).toHaveBeenCalledWith(
      [{ translate: '20px 0px' }, { translate: '0px 0px' }],
      { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  });

  it('should dismiss past the distance threshold and remove after the fling', async () => {
    const element = makeElement();
    const onDismiss = vi.fn();
    const onRemove = vi.fn();
    attachSwipe(element, { onDismiss, onRemove });

    // Slow but far: distance passes, velocity does not.
    drag(element, [
      [30, 0, 200],
      [60, 0, 200],
    ]);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(element.getAttribute('data-swipe-direction')).toBe('right');

    await Promise.resolve();
    await Promise.resolve();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('should dismiss a short but fast flick via the velocity threshold', () => {
    const element = makeElement();
    const onDismiss = vi.fn();
    attachSwipe(element, { onDismiss, onRemove: () => {} });

    // 20px in 50ms: 0.4 px/ms beats the velocity gate, distance does not.
    drag(element, [[20, 0, 50]]);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should wire the release velocity into the fling duration and easing', () => {
    const element = makeElement();
    const animate = vi.spyOn(Element.prototype, 'animate');
    attachSwipe(element, {
      onDismiss: () => {},
      onRemove: () => {},
      // Lift the clamp so the raw velocity-match formula is observable.
      fling: { maxDuration: 100_000 },
    });

    // 20px in 50ms: velocity 0.4 px/ms.
    drag(element, [[20, 0, 50]]);

    // exitTarget measures from the resting box to the viewport edge
    // plus the buffer; jsdom rects are zeros, so backing the 20px drag
    // out of the rect shows up as +20 here.
    const target = window.innerWidth + 20 + 40;
    const [keyframes, timing] = animate.mock.calls[0]! as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];

    expect(keyframes).toEqual([
      { translate: '20px 0px' },
      { translate: `${target}px 0px` },
    ]);
    // slope * remaining / velocity, with the default slope of 3.
    expect(timing.duration).toBeCloseTo((3 * (target - 20)) / 0.4, 5);
    expect(timing.easing).toBe('cubic-bezier(0.333, 1, 0.7, 1)');
  });

  it('should treat pointercancel as a cancel regardless of thresholds', () => {
    const element = makeElement();
    const onDismiss = vi.fn();
    attachSwipe(element, { onDismiss, onRemove: () => {} });

    drag(
      element,
      [
        [40, 0, 50],
        [80, 0, 50],
      ],
      'pointercancel'
    );

    expect(onDismiss).not.toHaveBeenCalled();
    expect(element.style.translate).toBe('0px 0px');
  });

  it('should suppress the click synthesized after a drag', () => {
    const element = makeElement();
    const onClick = vi.fn();
    element.parentElement!.addEventListener('click', onClick);
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not arm click suppression after a pointercancel', () => {
    const element = makeElement();
    const onClick = vi.fn();
    element.parentElement!.addEventListener('click', onClick);
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    // pointercancel synthesizes no click: the next real one must pass.
    drag(
      element,
      [
        [10, 0, 100],
        [20, 0, 100],
      ],
      'pointercancel'
    );
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should suppress the click for a direct listener on the element', () => {
    const element = makeElement();
    const onClick = vi.fn();
    element.addEventListener('click', onClick);
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('should let a click through once the suppression window expires', async () => {
    const element = makeElement();
    const onClick = vi.fn();
    element.parentElement!.addEventListener('click', onClick);
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);

    // AbortSignal.timeout runs on the real clock, out of reach of the
    // fake timers that drive the drag.
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 450));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should capture the pointer only once the gesture locks onto the axis', () => {
    const element = makeElement();
    const capture = vi.spyOn(element, 'setPointerCapture');
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    // A plain tap: capturing here would retarget the compatibility
    // click away from the toast's interactive children.
    firePointer(element, 'pointerdown', 0, 0);
    firePointer(element, 'pointerup', 0, 0);
    expect(capture).not.toHaveBeenCalled();

    // A vertical drag is ours under the mixed default and captures too,
    // so the no-capture case here stays a plain tap.

    // A drag locked onto our axis does.
    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('should let a plain tap click through', () => {
    const element = makeElement();
    const onClick = vi.fn();
    element.parentElement!.addEventListener('click', onClick);
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    firePointer(element, 'pointerdown', 0, 0);
    firePointer(element, 'pointerup', 0, 0);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should skip animations and remove immediately under reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);

    const element = makeElement();
    const onRemove = vi.fn();
    const animate = vi.spyOn(Element.prototype, 'animate');
    attachSwipe(element, { onDismiss: () => {}, onRemove });

    drag(element, [
      [30, 0, 200],
      [60, 0, 200],
    ]);

    expect(onRemove).toHaveBeenCalledTimes(1); // synchronously, no fling
    expect(animate).not.toHaveBeenCalled();
  });

  it('should ignore a grab once the toast is exiting', () => {
    const element = makeElement();
    const onDismiss = vi.fn();
    attachSwipe(element, { onDismiss, onRemove: () => {} });

    drag(element, [
      [30, 0, 200],
      [60, 0, 200],
    ]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    const parked = element.style.translate;

    // The departure phase is one-way: a re-grab must not resurrect the toast.
    drag(element, [
      [30, 0, 200],
      [60, 0, 200],
    ]);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.style.translate).toBe(parked);
  });

  it('should cancel the running spring overlay on a re-grab', () => {
    const cancel = vi.fn();
    vi.spyOn(Element.prototype, 'animate').mockReturnValue({
      finished: Promise.resolve(),
      cancel,
    } as unknown as Animation);

    const element = makeElement();
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

    // Below both thresholds: the release starts the cancel spring.
    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);
    expect(cancel).not.toHaveBeenCalled();

    firePointer(element, 'pointerdown', 0, 0);

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('should cancel the live overlay on detach', () => {
    const cancel = vi.fn();
    vi.spyOn(Element.prototype, 'animate').mockReturnValue({
      finished: Promise.resolve(),
      cancel,
    } as unknown as Animation);

    const element = makeElement();
    const detach = attachSwipe(element, {
      onDismiss: () => {},
      onRemove: () => {},
    });

    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);

    detach();

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('should not fire onRemove when detached during the fling', async () => {
    // A cancelled WAAPI animation rejects its finished promise; the
    // always-resolved global stub cannot model that, so this test builds
    // its own controllable animation.
    let rejectFinished!: (reason?: unknown) => void;
    vi.spyOn(Element.prototype, 'animate').mockReturnValue({
      finished: new Promise((_, reject) => {
        rejectFinished = reject;
      }),
      cancel() {
        rejectFinished(new DOMException('Aborted', 'AbortError'));
      },
    } as unknown as Animation);

    const element = makeElement();
    const onRemove = vi.fn();
    const detach = attachSwipe(element, { onDismiss: () => {}, onRemove });

    drag(element, [
      [30, 0, 200],
      [60, 0, 200],
    ]);

    detach();
    await Promise.resolve();
    await Promise.resolve();

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('should clear data-swiping when detached mid-drag', () => {
    const element = makeElement();
    const detach = attachSwipe(element, {
      onDismiss: () => {},
      onRemove: () => {},
    });

    firePointer(element, 'pointerdown', 0, 0);
    vi.advanceTimersByTime(50);
    firePointer(element, 'pointermove', 10, 2);
    expect(element.getAttribute('data-swiping')).toBe('true');

    detach();

    expect(element.hasAttribute('data-swiping')).toBe(false);
  });
});
