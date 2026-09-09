import { cleanup, render } from '@testing-library/preact';
import { useStack } from './use-stack';

/** jsdom lacks ResizeObserver; the layout tolerates silent stubs. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function Host() {
  const stack = useStack([]);
  return <ol data-testid="viewport" ref={stack.ref} />;
}

beforeEach(() => {
  window.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

describe('useStack', () => {
  it('should size the viewport element through the ref and release it on unmount', () => {
    const view = render(<Host />);
    const viewport = view.getByTestId('viewport');

    expect(viewport.style.getPropertyValue('--cincin-stack-height')).toBe('0');
    expect(viewport.style.getPropertyValue('--cincin-stack-backs')).toBe('0');

    view.unmount();

    expect(viewport.style.getPropertyValue('--cincin-stack-height')).toBe('');
  });
});
