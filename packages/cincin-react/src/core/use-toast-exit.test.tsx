import { cleanup, fireEvent, render } from '@testing-library/react';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { useToastExit } from './use-toast-exit';
import type { Toaster } from 'cincin';
import type { Presenter, PresentationKey } from 'cincin/presenter';

function ExitHost({
  presentationKey,
  presenter,
}: {
  presentationKey: PresentationKey;
  presenter: Presenter;
}) {
  const onExitEnd = useToastExit(presentationKey, presenter);
  return (
    <li data-testid="toast" onTransitionEnd={onExitEnd}>
      <button data-testid="child" type="button" />
    </li>
  );
}

let reduceMotion = false;

function setup(): {
  toaster: Toaster;
  presenter: Presenter;
  key: PresentationKey;
} {
  const toaster = createToaster();
  const presenter = createPresenter(toaster);
  presenter.mount();
  toaster.message('leaving soon');
  return { toaster, presenter, key: presenter.getSnapshot()[0]!.key };
}

function getToast(): HTMLElement {
  return document.querySelector('[data-testid="toast"]') as HTMLElement;
}

beforeEach(() => {
  reduceMotion = false;
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion') && reduceMotion,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
});

describe('useToastExit', () => {
  it('should finish a leaving presentation when its exit ends', () => {
    const { toaster, presenter, key } = setup();
    render(<ExitHost presentationKey={key} presenter={presenter} />);

    presenter.dismiss(key);
    fireEvent.transitionEnd(getToast());

    expect(presenter.getSnapshot()).toHaveLength(0);
    // The presenter owned the record: it is gone from the store too.
    expect(toaster.getSnapshot()).toHaveLength(0);
    presenter.unmount();
  });

  it('should ignore end events bubbling from children', () => {
    const { presenter, key } = setup();
    render(<ExitHost presentationKey={key} presenter={presenter} />);

    presenter.dismiss(key);
    fireEvent.transitionEnd(
      document.querySelector('[data-testid="child"]') as HTMLElement
    );

    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });

  it('should not finish a live presentation', () => {
    const { presenter, key } = setup();
    render(<ExitHost presentationKey={key} presenter={presenter} />);

    fireEvent.transitionEnd(getToast());

    expect(presenter.getSnapshot()[0]?.phase).toBe('active');
    presenter.unmount();
  });

  it('should leave a swiped exit to the controller', () => {
    const { presenter, key } = setup();
    render(<ExitHost presentationKey={key} presenter={presenter} />);

    getToast().setAttribute('data-swipe-direction', 'right');
    presenter.dismiss(key);
    fireEvent.transitionEnd(getToast());

    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });

  it('should finish synchronously under reduced motion', async () => {
    reduceMotion = true;
    const { presenter, key } = setup();
    render(<ExitHost presentationKey={key} presenter={presenter} />);

    presenter.dismiss(key);
    await Promise.resolve();

    expect(presenter.getSnapshot()).toHaveLength(0);
    presenter.unmount();
  });

  it('should finish a ghost of a removed record under reduced motion', async () => {
    reduceMotion = true;
    const { toaster, presenter, key } = setup();
    render(<ExitHost presentationKey={key} presenter={presenter} />);

    // A programmatic remove turns the presentation into a leaving ghost;
    // without motion there is no exit to wait for.
    toaster.remove(toaster.getSnapshot()[0]!.id);
    await Promise.resolve();

    expect(presenter.getSnapshot()).toHaveLength(0);
    presenter.unmount();
  });

  it('should drop the subscription on unmount', async () => {
    reduceMotion = true;
    const { presenter, key } = setup();
    const view = render(
      <ExitHost presentationKey={key} presenter={presenter} />
    );

    view.unmount();
    presenter.dismiss(key);
    await Promise.resolve();

    // Nobody finishes the exit anymore: the safety net will.
    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });
});
