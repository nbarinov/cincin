import { cleanup, render, renderHook } from '@testing-library/react';
import * as React from 'react';
import { useLatestRef } from './use-latest-ref';

afterEach(() => {
  cleanup();
});

describe('useLatestRef', () => {
  it('should expose the latest value after every render', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: 'first' } }
    );

    expect(result.current.current).toBe('first');

    rerender({ value: 'second' });
    expect(result.current.current).toBe('second');
  });

  it('should keep a stable ref identity across renders', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatestRef(value),
      { initialProps: { value: 1 } }
    );
    const firstRef = result.current;

    rerender({ value: 2 });
    expect(result.current).toBe(firstRef);
  });

  it('should be fresh by the time ref callbacks of the same commit run', () => {
    const seen: string[] = [];

    function Host({ value }: { value: string }) {
      const latest = useLatestRef(value);

      // A new identity per value re-runs the ref during commit, exactly
      // how useToastSwipe reattaches on a direction change. The sync
      // must have happened by then: an effect-based one lags a commit
      // behind and would record the previous value here.
      const probe = React.useCallback(
        (element: HTMLElement | null) => {
          if (element !== null) {
            seen.push(latest.current);
          }
        },
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- value is deliberate: it drives the fresh identity, latest is a stable box
        [value]
      );

      return <div ref={probe} />;
    }

    const view = render(<Host value="first" />);
    view.rerender(<Host value="second" />);

    expect(seen).toEqual(['first', 'second']);
  });
});
