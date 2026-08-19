import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { usePresentations } from './use-presentations';
import { EMPTY_SNAPSHOT } from '../shared/ssr';

afterEach(() => {
  cleanup();
});

describe('usePresentations', () => {
  it('should read the current snapshot and follow presenter updates', () => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();
    const { result } = renderHook(() => usePresentations(presenter));

    expect(result.current).toEqual([]);

    act(() => {
      toaster.message('one');
    });
    expect(result.current.map((p) => p.phase)).toEqual(['active']);

    act(() => {
      presenter.dismiss(result.current[0]!.key);
    });
    expect(result.current.map((p) => p.phase)).toEqual(['leaving']);

    presenter.unmount();
  });

  it('should render the shared empty snapshot on the server', () => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();
    toaster.message('created before hydration');

    let seen: ReadonlyArray<unknown> | undefined;
    function Probe() {
      seen = usePresentations(presenter);
      return null;
    }

    renderToString(<Probe />);

    expect(seen).toBe(EMPTY_SNAPSHOT);
    presenter.unmount();
  });
});
