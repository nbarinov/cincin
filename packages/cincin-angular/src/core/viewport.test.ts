import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render } from '@testing-library/angular';
import { createToaster } from 'cincin';
import type { Toaster } from 'cincin';
import { createPresenter, createPresenterHolder } from 'cincin/presenter';
import type { Presenter, PresenterHolder } from 'cincin/presenter';
import { CincinViewport } from './viewport';

const DELAY = 200;

let wiring: {
  presenter: Presenter;
  holder: PresenterHolder;
  collapseDelay: number | undefined;
};

@Component({
  imports: [CincinViewport],
  template: `
    <ol
      cincinViewport
      #viewport="cincinViewport"
      [presenter]="presenter"
      [holder]="holder"
      [collapseDelay]="collapseDelay"
      data-testid="viewport"
      [attr.data-expanded]="viewport.expanded()"
    >
      <li>
        <button
          type="button"
          data-testid="inside"
          aria-label="Dismiss"
        ></button>
      </li>
    </ol>
  `,
})
class Host {
  readonly presenter = wiring.presenter;
  readonly holder = wiring.holder;
  readonly collapseDelay = wiring.collapseDelay;
}

async function setup(collapseDelay?: number) {
  const toaster: Toaster = createToaster();
  const presenter = createPresenter(toaster);
  const holder = createPresenterHolder(presenter);
  presenter.mount();
  toaster.message('one');
  wiring = { presenter, holder, collapseDelay };

  const view = await render(Host);
  const viewport = view.getByTestId('viewport');
  const inside = view.getByTestId('inside');

  return { toaster, presenter, viewport, inside, view };
}

function isExpanded(viewport: HTMLElement): boolean {
  return viewport.dataset['expanded'] === 'true';
}

function paused(presenter: Presenter): boolean[] {
  return presenter.getSnapshot().map((toast) => toast.paused);
}

/** The default presenter exit clock plus its grace. */
function presenterExitMs(): number {
  return 2000 + 50;
}

/** Runs the pending fold and lets change detection through. */
function settle(ms: number): void {
  vi.advanceTimersByTime(ms);
  TestBed.tick();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Lifecycle facts only: the attention rules live in the machine's
// own suite in `cincin/dom` and are not restated here.
describe('CincinViewport', () => {
  it('should start folded and open on mouse enter', async () => {
    const { viewport } = await setup();
    expect(isExpanded(viewport)).toBe(false);

    fireEvent.mouseEnter(viewport);
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should read the collapse delay from the input', async () => {
    const { viewport } = await setup(50);
    fireEvent.mouseEnter(viewport);
    fireEvent.mouseLeave(viewport);

    settle(50);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should hold the presenter while open and release it on close', async () => {
    const { presenter, viewport } = await setup();
    expect(paused(presenter)).toEqual([false]);

    fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    fireEvent.mouseLeave(viewport);
    settle(DELAY);
    expect(paused(presenter)).toEqual([false]);
  });

  it('should release the presenter on destroy', async () => {
    const { presenter, viewport, view } = await setup();
    fireEvent.mouseEnter(viewport);
    expect(paused(presenter)).toEqual([true]);

    view.fixture.destroy();
    expect(paused(presenter)).toEqual([false]);
  });

  it('should open on focus within', async () => {
    // Focus does not bubble: the directive listens to the bubbling pair.
    const { viewport, inside } = await setup();
    inside.focus();
    TestBed.tick();
    expect(isExpanded(viewport)).toBe(true);
  });

  it('should fold on a pointerdown outside the stack', async () => {
    const { viewport } = await setup();
    fireEvent.mouseEnter(viewport);

    fireEvent.pointerDown(document.body);
    settle(DELAY);
    expect(isExpanded(viewport)).toBe(false);
  });

  it('should stop listening to the document on destroy', async () => {
    const { viewport, view } = await setup();
    fireEvent.mouseEnter(viewport);
    view.fixture.destroy();

    // A folded stack that nobody drives stays quiet: no throw, no
    // stray hover end reaching a destroyed controller.
    expect(() => fireEvent.pointerDown(document.body)).not.toThrow();
  });

  it('should end the hover when the stack empties', async () => {
    // The last card leaves from under a parked pointer: no mouseleave
    // arrives, so the next toast must not be born into an open stack.
    const { toaster, viewport } = await setup();
    fireEvent.mouseEnter(viewport);

    toaster.remove();
    // The ghost finishes its exit through the safety net.
    settle(presenterExitMs());
    settle(DELAY);
    expect(isExpanded(viewport)).toBe(false);
  });
});
