import { act, cleanup, renderHook } from '@testing-library/preact';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { useToasts } from './use-toasts';

afterEach(() => {
  cleanup();
});

describe('useToasts', () => {
  it('should read the current snapshot and follow presenter updates', () => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();
    const { result } = renderHook(() => useToasts(presenter));

    expect(result.current).toEqual([]);

    act(() => {
      toaster.message('one');
    });
    expect(result.current.map((p) => p.phase)).toEqual(['active']);

    act(() => {
      presenter.dismiss(result.current[0]!.key);
    });
    expect(result.current.map((p) => p.phase)).toEqual(['leaving']);

    // The unmount clears the snapshot into the live subscriber: a
    // Preact update, so it belongs inside act.
    act(() => {
      presenter.unmount();
    });
  });
});
