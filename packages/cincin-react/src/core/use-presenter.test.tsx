import { StrictMode } from 'react';
import { cleanup, render, renderHook } from '@testing-library/react';
import { createToaster } from 'cincin';
import { usePresenter } from './use-presenter';
import type { Presenter } from 'cincin/presenter';

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

  it('should keep showing through a StrictMode double effect', () => {
    const toaster = createToaster();
    toaster.message('strict');
    let presenter!: Presenter;

    function Host() {
      presenter = usePresenter(toaster);
      return null;
    }

    render(
      <StrictMode>
        <Host />
      </StrictMode>
    );

    // mount, unmount, mount: the count lands at one, the region shows.
    expect(presenter.getSnapshot()).toHaveLength(1);
  });

  it('should pass the config through', () => {
    const toaster = createToaster();
    const { result } = renderHook(() => usePresenter(toaster, { max: 1 }));

    expect(result.current.config.max).toBe(1);
  });
});
