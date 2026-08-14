import { attachSwipe } from './attach-swipe';

function makeElement(): HTMLElement {
  const parent = document.createElement('div');
  const element = document.createElement('div');
  parent.append(element);
  document.body.append(parent);
  return element;
}

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
    element.style.touchAction = 'none';

    const detach = attachSwipe(element, {
      onDismiss: () => {},
      onRemove: () => {},
    });
    expect(element.style.touchAction).toBe('pan-y');

    detach();
    expect(element.style.touchAction).toBe('none');
    expect(element.style.translate).toBe('');
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
    attachSwipe(element, { onDismiss: () => {}, onRemove: () => {} });

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

    // 20px over 200ms: velocity 0.1 px/ms, both thresholds missed.
    drag(element, [
      [10, 0, 100],
      [20, 0, 100],
    ]);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(element.style.translate).toBe('0px 0px'); // spring rest target
    expect(animate).toHaveBeenCalledTimes(1); // the spring overlay
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
