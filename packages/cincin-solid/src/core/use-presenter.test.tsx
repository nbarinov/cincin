import { cleanup, render } from '@solidjs/testing-library';
import { createToaster } from 'cincin';
import type { Presenter, PresenterOptions } from 'cincin/presenter';
import { createSignal } from 'solid-js';
import type { MaybeAccessor } from '../shared/maybe-accessor';
import { usePresenter } from './use-presenter';
import { useToasts } from './use-toasts';

function setup(options?: MaybeAccessor<PresenterOptions>) {
  const toaster = createToaster();
  let presenter!: Presenter<string>;

  const Host = () => {
    presenter = usePresenter(toaster, options);
    return <div />;
  };

  const view = render(() => <Host />);

  return { toaster, presenter, view };
}

afterEach(() => {
  cleanup();
});

describe('usePresenter', () => {
  it('should live with the component: mounted on mount, unmounted on unmount', () => {
    const { toaster, presenter, view } = setup();

    toaster.message('hello');
    expect(presenter.getSnapshot()).toHaveLength(1);

    view.unmount();
    expect(presenter.getSnapshot()).toHaveLength(0);
  });

  it('should keep options live through a getter', () => {
    const [max, setMax] = createSignal(1);
    const { toaster, presenter } = setup(() => ({ max: max() }));

    toaster.message('one');
    toaster.message('two');

    const active = () =>
      presenter.getSnapshot().filter((toast) => toast.phase === 'active');
    expect(active()).toHaveLength(1);

    // The raise lands synchronously through the render effect and
    // promotes the queued toast.
    setMax(2);

    expect(active()).toHaveLength(2);
  });
});

describe('useToasts', () => {
  it('should follow the presenter snapshot', () => {
    const toaster = createToaster();
    let toasts!: ReturnType<typeof useToasts<string>>;

    const Host = () => {
      const presenter = usePresenter(toaster);
      toasts = useToasts(presenter);
      return <div>{toasts().map((toast) => toast.entry.content)}</div>;
    };

    const view = render(() => <Host />);
    expect(toasts()).toHaveLength(0);

    toaster.message('hello');

    expect(toasts()).toHaveLength(1);
    expect(view.container.textContent).toBe('hello');
  });
});
