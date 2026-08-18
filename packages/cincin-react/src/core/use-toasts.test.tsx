import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createToaster } from 'cincin';
import { useToasts } from './use-toasts';
import { EMPTY_SNAPSHOT } from '../shared/ssr';

afterEach(() => {
  cleanup();
});

describe('useToasts', () => {
  it('should read the current snapshot and follow updates', () => {
    const toaster = createToaster();
    const { result } = renderHook(() => useToasts(toaster));

    expect(result.current).toEqual([]);

    act(() => {
      toaster.message('one');
    });
    expect(result.current.map((toast) => toast.content)).toEqual(['one']);

    act(() => {
      toaster.remove();
    });
    expect(result.current).toEqual([]);

    toaster.destroy();
  });

  it('should unsubscribe on unmount', () => {
    const toaster = createToaster();
    const { unmount } = renderHook(() => useToasts(toaster));

    unmount();
    // A stale subscriber would keep tearing on the next commit; the core
    // simply reports zero listeners after the hook is gone.
    act(() => {
      toaster.message('after unmount');
    });

    expect(toaster.getSnapshot()).toHaveLength(1);
    toaster.destroy();
  });

  it('should render the shared empty snapshot on the server', () => {
    const toaster = createToaster();
    toaster.message('created before hydration');

    let seen: ReadonlyArray<unknown> | undefined;
    function Probe() {
      seen = useToasts(toaster);
      return null;
    }

    renderToString(<Probe />);

    // Not just empty: the very same frozen instance, so hydration
    // compares equal by reference and never reports a mismatch.
    expect(seen).toBe(EMPTY_SNAPSHOT);
    toaster.destroy();
  });
});
