import { cleanup, fireEvent, render } from '@testing-library/vue';
import { createStackLayout } from 'cincin/dom';
import type { FocusLoopController } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { defineComponent, h, nextTick, toHandlers } from 'vue';
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

  const Host = defineComponent({
    setup() {
      const focusLoop = useFocusLoop({ layout });
      loop = focusLoop.loop;

      return () =>
        h(
          'section',
          { 'data-testid': 'region', ...toHandlers(focusLoop.handlers) },
          [
            h('ol', [
              h('li', [
                h('button', {
                  type: 'button',
                  'data-testid': 'card',
                  'aria-label': 'Saved',
                  ref: (element: unknown) =>
                    layout.setCard(
                      KEY,
                      element instanceof HTMLElement ? element : null
                    ),
                }),
              ]),
            ]),
          ]
        );
    },
  });

  const view = render(Host);
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
  it('should jump onto the front card and hand focus back on Escape', async () => {
    const { loop, card, outside } = setup();
    outside.focus();

    loop.jump();
    expect(document.activeElement).toBe(card);

    await fireEvent.keyDown(card, { key: 'Escape' });
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
    await nextTick();
    expect(document.activeElement).toBe(outside);
  });

  it('should forget the origin once focus leaves the region', async () => {
    const { card, outside } = setup();
    outside.focus();
    card.focus();
    outside.focus();
    // Back in from nowhere the browser can name.
    outside.blur();
    card.focus();

    await fireEvent.keyDown(card, { key: 'Escape' });
    expect(document.activeElement).toBe(document.body);
  });
});
