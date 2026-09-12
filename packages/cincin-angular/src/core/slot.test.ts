import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { render } from '@testing-library/angular';
import type { ToastKey } from 'cincin/presenter';
import { CincinSlot } from './slot';
import { CincinStack } from './stack';

@Component({
  imports: [CincinStack, CincinSlot],
  template: `
    <ol
      cincinStack
      #stack="cincinStack"
      [entries]="entries()"
      data-testid="stack"
    >
      @for (entry of entries(); track entry.key) {
        <li
          cincinSlot
          #slot="cincinSlot"
          [layout]="stack.layout"
          [key]="entry.key"
          [attr.data-index]="slot.slot()?.index"
          [attr.data-key]="entry.key"
        ></li>
      }
    </ol>
  `,
})
class Host {
  readonly entries = signal<Array<{ key: ToastKey; phase: 'active' }>>([]);
}

describe('CincinSlot', () => {
  it('should register each card with the layout and receive its slot in the same pass', async () => {
    const view = await render(Host);
    const host = view.fixture.componentInstance;

    host.entries.set([
      { key: 'a', phase: 'active' },
      { key: 'b', phase: 'active' },
    ]);
    await view.fixture.whenStable();

    // The default order is 'stack': the last entry is the front card.
    const cards = view.container.querySelectorAll('li');
    expect([...cards].map((card) => card.dataset.index)).toEqual(['1', '0']);
  });

  it('should detach a card that leaves the list', async () => {
    const view = await render(Host);
    const host = view.fixture.componentInstance;

    host.entries.set([{ key: 'a', phase: 'active' }]);
    await view.fixture.whenStable();
    const stack = view.fixture.debugElement
      .query(By.directive(CincinStack))
      .injector.get(CincinStack);
    expect(stack.layout.getSlot('a')).toBeDefined();

    host.entries.set([]);
    await view.fixture.whenStable();
    expect(stack.layout.getSlot('a')).toBeUndefined();
  });
});
