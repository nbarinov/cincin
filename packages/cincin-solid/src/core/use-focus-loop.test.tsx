import { cleanup, fireEvent, render } from '@solidjs/testing-library';
import { createStackLayout } from 'cincin/dom';
import type { FocusLoopController } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { useFocusLoop } from './use-focus-loop';

const KEY = 'a' as ToastKey;

/** The page control focus comes from, outside the rendered tree so it
 * outlives the host. */
function makeOutside(): HTMLButtonElement {
  const outside = document.createElement('button');
  document.body.append(outside);
  return outside;
}

function setup() {
  const layout = createStackLayout();
  const outside = makeOutside();
  let loop!: FocusLoopController;

  const Host = () => {
    const focusLoop = useFocusLoop({ layout });
    loop = focusLoop.loop;

    return (
      <section data-testid="region" {...focusLoop.handlers}>
        <ol>
          <li>
            <button
              type="button"
              data-testid="card"
              aria-label="Saved"
              ref={(element) => layout.setCard(KEY, element)}
            />
          </li>
        </ol>
      </section>
    );
  };

  const view = render(() => <Host />);
  layout.setEntries([{ key: KEY, leaving: false }]);

  return {
    layout,
    view,
    loop,
    card: view.getByTestId('card'),
    outside,
  };
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('useFocusLoop', () => {
  it('should jump onto the front card and hand focus back on Escape', () => {
    const { loop, card, outside } = setup();
    outside.focus();

    loop.jump();
    expect(document.activeElement).toBe(card);

    fireEvent.keyDown(card, { key: 'Escape' });
    expect(document.activeElement).toBe(outside);
  });

  it('should run the loop while mounted', () => {
    const { layout, card, outside } = setup();
    outside.focus();
    card.focus();

    layout.setEntries([{ key: KEY, leaving: true }]);
    expect(document.activeElement).toBe(outside);
  });

  it('should hand focus back on unmount', async () => {
    const { view, card, outside } = setup();
    outside.focus();
    card.focus();

    view.unmount();
    await Promise.resolve();
    expect(document.activeElement).toBe(outside);
  });

  it('should forget the origin once focus leaves the region', () => {
    const { card, outside } = setup();
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
