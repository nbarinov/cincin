import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import type { Presenter, ToastKey } from 'cincin/presenter';
import type { SwipeDirection } from 'cincin/dom';
import { CincinToastSwipe } from './toast-swipe';

let wiring: { presenter: Presenter; key: ToastKey };
const directions = signal<readonly SwipeDirection[] | undefined>(undefined);
const enabled = signal(true);

@Component({
  imports: [CincinToastSwipe],
  template: `
    <li
      cincinToastSwipe
      data-testid="toast"
      [key]="key"
      [presenter]="presenter"
      [directions]="directions()"
      [enabled]="enabled()"
    ></li>
  `,
})
class Host {
  readonly presenter = wiring.presenter;
  readonly key = wiring.key;
  readonly directions = directions;
  readonly enabled = enabled;
}

/** A mounted presenter over a fresh toaster with one shown toast. */
async function setup(options?: {
  directions?: readonly SwipeDirection[];
  enabled?: boolean;
}) {
  const toaster = createToaster();
  const presenter = createPresenter(toaster);
  presenter.mount();
  toaster.message('swipe me');
  const key = presenter.getSnapshot()[0]?.key;

  if (key === undefined) {
    throw new Error('no toast shown');
  }

  wiring = { presenter, key };
  directions.set(options?.directions);
  enabled.set(options?.enabled ?? true);

  const view = await render(Host);

  return { presenter, view, element: view.getByTestId('toast') };
}

function firePointer(
  element: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number
): void {
  element.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      bubbles: true,
      clientX: x,
      clientY: 0,
    })
  );
}

/** A drag far past the 45px distance gate: the release dismisses. */
function swipeOut(element: HTMLElement): void {
  firePointer(element, 'pointerdown', 0);
  firePointer(element, 'pointermove', 30);
  firePointer(element, 'pointermove', 60);
  firePointer(element, 'pointerup', 60);
}

describe('CincinToastSwipe', () => {
  it('should attach the controller after the render and detach it on destroy', async () => {
    const { presenter, view, element } = await setup();
    expect(element.style.touchAction).toBe('none');

    view.fixture.destroy();
    presenter.unmount();
  });

  it('should reattach the controller when the directions input changes', async () => {
    const { presenter, element } = await setup({ directions: ['right'] });
    expect(element.style.touchAction).toBe('pan-y');

    directions.set(['down']);
    TestBed.tick();
    expect(element.style.touchAction).toBe('pan-x');
    presenter.unmount();
  });

  it('should wire dismiss and finish to the presenter on a passing gesture', async () => {
    const { presenter, element } = await setup();

    swipeOut(element);
    expect(element.getAttribute('data-swipe-direction')).toBe('right');
    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');

    // The stubbed fling resolves immediately: finish follows, and the
    // presenter removes the record it owned.
    await Promise.resolve();
    await Promise.resolve();
    expect(presenter.getSnapshot()).toHaveLength(0);
    presenter.unmount();
  });

  it('should not attach the controller while disabled', async () => {
    const { presenter, element } = await setup({ enabled: false });

    // No controller at all: no touch-action claim, and a passing gesture
    // changes nothing.
    expect(element.style.touchAction).toBe('');
    swipeOut(element);
    expect(element.hasAttribute('data-swiping')).toBe(false);
    expect(presenter.getSnapshot()[0]?.phase).toBe('active');
    presenter.unmount();
  });

  it('should attach once enabled flips to true', async () => {
    const { presenter, element } = await setup({ enabled: false });
    expect(element.style.touchAction).toBe('');

    enabled.set(true);
    TestBed.tick();
    expect(element.style.touchAction).toBe('none');

    swipeOut(element);
    expect(presenter.getSnapshot()[0]?.phase).toBe('leaving');
    presenter.unmount();
  });

  it('should detach and release its claims once disabled', async () => {
    const { presenter, element } = await setup();
    expect(element.style.touchAction).toBe('none');

    enabled.set(false);
    TestBed.tick();
    expect(element.style.touchAction).toBe('');
    presenter.unmount();
  });
});
