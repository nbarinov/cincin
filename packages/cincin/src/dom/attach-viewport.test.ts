import { attachViewport } from './attach-viewport';
import { makeElement } from './test-helpers';
import { createViewportController } from './viewport-controller';

const DELAY = 200;

function fire(target: EventTarget, type: string): void {
  target.dispatchEvent(new Event(type, { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('attachViewport', () => {
  it('should drive the machine from native events', () => {
    const element = makeElement();
    const viewport = createViewportController();
    attachViewport(element, viewport);

    fire(element, 'mouseenter');
    expect(viewport.getSnapshot()).toBe(true);

    fire(element, 'mouseleave');
    vi.advanceTimersByTime(DELAY);
    expect(viewport.getSnapshot()).toBe(false);

    fire(element, 'focusin');
    expect(viewport.getSnapshot()).toBe(true);
  });

  it('should fold on a pointerdown outside the element, not on one inside', () => {
    const element = makeElement();
    const viewport = createViewportController();
    attachViewport(element, viewport);

    fire(element, 'mouseenter');
    fire(element, 'pointerdown');
    fire(element, 'pointerup');
    vi.advanceTimersByTime(DELAY);
    expect(viewport.getSnapshot()).toBe(true);

    fire(document.body, 'pointerdown');
    vi.advanceTimersByTime(DELAY);
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should detach through the returned function', () => {
    const element = makeElement();
    const viewport = createViewportController();
    const detach = attachViewport(element, viewport);

    detach();
    fire(element, 'mouseenter');
    expect(viewport.getSnapshot()).toBe(false);

    // The document listener goes with the rest: a folded stack that
    // nobody listens for stays folded.
    const listener = vi.fn();
    viewport.subscribe(listener);
    fire(document.body, 'pointerdown');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should detach when the given signal aborts', () => {
    const element = makeElement();
    const viewport = createViewportController();
    const owner = new AbortController();
    attachViewport(element, viewport, { signal: owner.signal });

    owner.abort();
    fire(element, 'mouseenter');
    expect(viewport.getSnapshot()).toBe(false);
  });

  it('should still detach through the returned function with a signal given', () => {
    const element = makeElement();
    const viewport = createViewportController();
    const owner = new AbortController();
    const detach = attachViewport(element, viewport, { signal: owner.signal });

    detach();
    fire(element, 'mouseenter');
    expect(viewport.getSnapshot()).toBe(false);
  });
});
