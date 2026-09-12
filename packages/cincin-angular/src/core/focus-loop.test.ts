import {
  Component,
  ElementRef,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import { fireEvent, render } from '@testing-library/angular';
import { createStackLayout } from 'cincin/dom';
import type { StackLayout } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { CincinFocusLoop } from './focus-loop';

const KEY: ToastKey = 'a';

let currentLayout: StackLayout;

@Component({
  imports: [CincinFocusLoop],
  template: `
    <section cincinFocusLoop [layout]="layout" data-testid="region">
      <ol>
        <li>
          <button
            #card
            type="button"
            data-testid="card"
            aria-label="Saved"
          ></button>
        </li>
      </ol>
    </section>
  `,
})
class Host {
  readonly layout = currentLayout;
  readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

  constructor() {
    afterNextRender(() => {
      this.layout.setCard(KEY, this.card().nativeElement);
    });
  }
}

/** The page control focus comes from, outside the rendered tree so it
 * outlives the host. */
function makeOutside(): HTMLButtonElement {
  const outside = document.createElement('button');
  document.body.append(outside);
  return outside;
}

async function setup() {
  const layout = createStackLayout();
  currentLayout = layout;
  const outside = makeOutside();
  const view = await render(Host);
  layout.setEntries([{ key: KEY, leaving: false }]);
  const loop = view.fixture.debugElement
    .query(By.directive(CincinFocusLoop))
    .injector.get(CincinFocusLoop);

  return { layout, view, loop, card: view.getByTestId('card'), outside };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CincinFocusLoop', () => {
  it('should jump onto the front card and hand focus back on Escape', async () => {
    const { loop, card, outside } = await setup();
    outside.focus();

    loop.jump();
    expect(document.activeElement).toBe(card);

    fireEvent.keyDown(card, { key: 'Escape' });
    expect(document.activeElement).toBe(outside);
  });

  it('should run the loop while mounted', async () => {
    const { layout, card, outside } = await setup();
    outside.focus();
    card.focus();

    layout.setEntries([{ key: KEY, leaving: true }]);
    expect(document.activeElement).toBe(outside);
  });

  it('should hand focus back on destroy', async () => {
    const { view, card, outside } = await setup();
    outside.focus();
    card.focus();

    view.fixture.destroy();
    // The loop hands the focus back once the render has settled: a
    // microtask after the unmount.
    await Promise.resolve();
    expect(document.activeElement).toBe(outside);
  });

  it('should forget the origin once focus leaves the region', async () => {
    const { card, outside } = await setup();
    outside.focus();
    card.focus();
    outside.focus();

    // Back in from nowhere the browser can name.
    outside.blur();
    card.focus();
    fireEvent.keyDown(card, { key: 'Escape' });
    expect(document.activeElement).toBe(document.body);
  });
});
