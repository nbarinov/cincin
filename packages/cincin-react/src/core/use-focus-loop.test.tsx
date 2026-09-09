import * as React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createStackLayout } from 'cincin/dom';
import type { FocusLoopController, StackLayout } from 'cincin/dom';
import type { ToastKey } from 'cincin/presenter';
import { useFocusLoop } from './use-focus-loop';

const KEY = 'a' as ToastKey;

function Host({
  layout,
  onLoop,
}: {
  layout: StackLayout;
  onLoop: (loop: FocusLoopController) => void;
}) {
  const { loop, handlers } = useFocusLoop({ layout });
  onLoop(loop);

  return (
    <section data-testid="region" {...handlers}>
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
}

/** The page control focus comes from, outside the React tree so it
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
  const view = render(
    <Host
      layout={layout}
      onLoop={(it) => {
        loop = it;
      }}
    />
  );
  act(() => layout.setEntries([{ key: KEY, leaving: false }]));

  return {
    layout,
    view,
    loop,
    card: view.getByTestId('card'),
    outside,
  };
}

beforeEach(() => {
  // Every focus is keyboard-driven here: the modality is the
  // translator's concern, this suite is about the hook's lifetime.
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
    this: Element,
    selectors: string
  ) {
    return selectors === ':focus-visible' || matches.call(this, selectors);
  });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('useFocusLoop', () => {
  it('should jump onto the front card and hand focus back on Escape', () => {
    const { loop, card, outside } = setup();
    act(() => outside.focus());

    act(() => loop.jump());
    expect(document.activeElement).toBe(card);

    fireEvent.keyDown(card, { key: 'Escape' });
    expect(document.activeElement).toBe(outside);
  });

  it('should run the loop while mounted', () => {
    const { layout, card, outside } = setup();
    act(() => outside.focus());
    act(() => card.focus());

    act(() => layout.setEntries([{ key: KEY, leaving: true }]));
    expect(document.activeElement).toBe(outside);
  });

  it('should hand focus back on unmount', async () => {
    const { view, card, outside } = setup();
    act(() => outside.focus());
    act(() => card.focus());

    view.unmount();
    await act(async () => {});
    expect(document.activeElement).toBe(outside);
  });

  it('should forget the origin once focus leaves the region', () => {
    const { card, outside } = setup();
    act(() => outside.focus());
    act(() => card.focus());
    act(() => outside.focus());
    // Back in from nowhere the browser can name.
    act(() => outside.blur());
    act(() => card.focus());

    fireEvent.keyDown(card, { key: 'Escape' });
    expect(document.activeElement).toBe(document.body);
  });
});
