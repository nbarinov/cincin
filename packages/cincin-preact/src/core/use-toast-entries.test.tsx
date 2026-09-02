import { act, cleanup, renderHook } from '@testing-library/preact';
import { createToaster } from 'cincin';
import { useToastEntries } from './use-toast-entries';

afterEach(() => {
  cleanup();
});

describe('useToastEntries', () => {
  it('should read the current snapshot and follow updates', () => {
    const toaster = createToaster();
    const { result, unmount } = renderHook(() => useToastEntries(toaster));

    expect(result.current).toEqual([]);

    act(() => {
      toaster.message('one');
    });
    expect(result.current.map((toast) => toast.content)).toEqual(['one']);

    act(() => {
      toaster.remove();
    });
    expect(result.current).toEqual([]);

    // The hook goes first: destroying under a live subscriber makes
    // the core warn about the leak it suspects.
    unmount();
    toaster.destroy();
  });

  it('should unsubscribe on unmount', () => {
    const toaster = createToaster();
    const { unmount } = renderHook(() => useToastEntries(toaster));

    unmount();
    // A stale subscriber would keep tearing on the next commit; the core
    // simply reports zero listeners after the hook is gone.
    act(() => {
      toaster.message('after unmount');
    });

    expect(toaster.getSnapshot()).toHaveLength(1);
    toaster.destroy();
  });
});
