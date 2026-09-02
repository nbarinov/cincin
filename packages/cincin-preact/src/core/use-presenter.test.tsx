import { cleanup, renderHook } from '@testing-library/preact';
import { createToaster } from 'cincin';
import { usePresenter } from './use-presenter';

afterEach(() => {
  cleanup();
});

describe('usePresenter', () => {
  it('should mount the presenter on commit and unmount it on cleanup', () => {
    const toaster = createToaster();
    toaster.message('early');

    const { result, unmount } = renderHook(() => usePresenter(toaster));
    expect(result.current.getSnapshot()).toHaveLength(1);

    unmount();
    expect(result.current.getSnapshot()).toHaveLength(0);
    // The store is none of the presenter's business on unmount.
    expect(toaster.getSnapshot()).toHaveLength(1);
  });

  it('should keep one presenter instance across rerenders', () => {
    const toaster = createToaster();
    const { result, rerender } = renderHook(() => usePresenter(toaster));
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('should apply options changes through setOptions', () => {
    const toaster = createToaster();
    toaster.message('a');
    toaster.message('b');

    const { result, rerender } = renderHook(
      ({ max }) => usePresenter(toaster, { max }),
      { initialProps: { max: 1 } }
    );
    expect(result.current.getSnapshot().map((t) => t.phase)).toEqual([
      'active',
      'queued',
    ]);

    rerender({ max: 2 });

    expect(result.current.options.max).toBe(2);
    expect(result.current.getSnapshot().map((t) => t.phase)).toEqual([
      'active',
      'active',
    ]);
  });

  it('should pass the options through', () => {
    const toaster = createToaster();
    const { result } = renderHook(() => usePresenter(toaster, { max: 1 }));

    expect(result.current.options.max).toBe(1);
  });
});
