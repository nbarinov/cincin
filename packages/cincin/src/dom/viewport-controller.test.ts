import { createViewportController } from './viewport-controller';

const DELAY = 200;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createViewportController', () => {
  it('should start folded', () => {
    const viewport = createViewportController();
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should open on hover at once', () => {
    const viewport = createViewportController();
    viewport.hover(true);
    expect(viewport.getSnapshot()).toBe(true);
  });

  it('should fold a delay after the hover ends', () => {
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.hover(false);

    expect(viewport.getSnapshot()).toBe(true);
    vi.advanceTimersByTime(DELAY - 1);
    expect(viewport.getSnapshot()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should cancel a pending fold when the hover returns', () => {
    // The pointer crossing the gap between two cards leaves and
    // re-enters within the delay: the stack must not flicker.
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.hover(false);
    vi.advanceTimersByTime(DELAY / 2);
    viewport.hover(true);
    vi.advanceTimersByTime(DELAY);

    expect(viewport.getSnapshot()).toBe(true);
  });

  it('should re-arm the delay on every request to fold', () => {
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.hover(false);
    vi.advanceTimersByTime(DELAY / 2);
    viewport.hover(false);
    vi.advanceTimersByTime(DELAY / 2);

    expect(viewport.getSnapshot()).toBe(true);
    vi.advanceTimersByTime(DELAY / 2);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should open on focus and fold after it leaves', () => {
    const viewport = createViewportController();
    viewport.focus(true);
    expect(viewport.getSnapshot()).toBe(true);

    viewport.focus(false);
    vi.advanceTimersByTime(DELAY);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should keep the stack open through a hover end while focus is inside', () => {
    // Attention is symmetric: a keyboard user who nudges the mouse
    // across the stack keeps it open until focus leaves too.
    const viewport = createViewportController();
    viewport.focus(true);
    viewport.hover(true);
    viewport.hover(false);
    vi.advanceTimersByTime(DELAY);

    expect(viewport.getSnapshot()).toBe(true);

    viewport.focus(false);
    vi.advanceTimersByTime(DELAY);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should keep the stack open through a focus end while hovered', () => {
    // A dismissed control drops focus to the body while the pointer
    // still parks on the stack.
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.focus(true);
    viewport.focus(false);
    vi.advanceTimersByTime(DELAY);

    expect(viewport.getSnapshot()).toBe(true);
  });

  it('should not arm a fold while a gesture is in flight', () => {
    // A swipe drifting off the stack takes the pointer with it; the
    // stack stays open until the gesture ends.
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.interact(true);
    viewport.hover(false);
    vi.advanceTimersByTime(DELAY);

    expect(viewport.getSnapshot()).toBe(true);
  });

  it('should fold after a gesture ends with the attention already gone', () => {
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.interact(true);
    viewport.hover(false);
    viewport.interact(false);

    expect(viewport.getSnapshot()).toBe(true);
    vi.advanceTimersByTime(DELAY);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should let a fold armed before the gesture run out', () => {
    const viewport = createViewportController();
    viewport.hover(true);
    viewport.hover(false);
    viewport.interact(true);
    vi.advanceTimersByTime(DELAY);

    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should not open on a gesture alone', () => {
    const viewport = createViewportController();
    viewport.interact(true);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should ignore a hover end while folded', () => {
    const viewport = createViewportController();
    const listener = vi.fn();
    viewport.subscribe(listener);

    viewport.hover(false);
    vi.advanceTimersByTime(DELAY);

    expect(viewport.getSnapshot()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should notify subscribers on flips only', () => {
    const viewport = createViewportController();
    const listener = vi.fn();
    viewport.subscribe(listener);

    viewport.hover(true);
    viewport.hover(true);
    viewport.focus(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(true);

    viewport.hover(false);
    viewport.focus(false);
    vi.advanceTimersByTime(DELAY);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('should read the delay from the options and from setOptions', () => {
    const viewport = createViewportController({ collapseDelay: 50 });
    viewport.hover(true);
    viewport.hover(false);
    vi.advanceTimersByTime(50);
    expect(viewport.getSnapshot()).toBe(false);

    viewport.setOptions({ collapseDelay: 500 });
    viewport.hover(true);
    viewport.hover(false);
    vi.advanceTimersByTime(499);
    expect(viewport.getSnapshot()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should keep the delay when setOptions leaves it undefined', () => {
    // A hook forwards its option as it is, `{ collapseDelay: undefined }`
    // when the skin gave none: that must not turn the fold immediate.
    const viewport = createViewportController();
    viewport.setOptions({ collapseDelay: undefined });
    viewport.hover(true);
    viewport.hover(false);

    vi.advanceTimersByTime(DELAY - 1);
    expect(viewport.getSnapshot()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should drop the pending fold and the listeners on destroy', () => {
    const viewport = createViewportController();
    const listener = vi.fn();
    viewport.subscribe(listener);
    viewport.hover(true);
    viewport.hover(false);
    listener.mockClear();

    viewport.destroy();
    vi.advanceTimersByTime(DELAY);

    expect(listener).not.toHaveBeenCalled();
    expect(viewport.hasListeners()).toBe(false);
  });
});
