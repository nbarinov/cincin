import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { createToaster } from 'cincin';
import type { Toaster } from 'cincin';
import { injectPresenter } from './inject-presenter';
import { injectToasts } from './inject-toasts';

// The host reads its wiring from module scope: a decorator cannot
// take test-local arguments.
let currentToaster: Toaster<string>;
const max = signal<number | undefined>(undefined);

@Component({
  template: `{{ names().join(',') }}`,
})
class Host {
  readonly presenter = injectPresenter(currentToaster, () => ({ max: max() }));
  readonly toasts = injectToasts(this.presenter);
  readonly names = () => this.toasts().map((toast) => toast.entry.content);
}

async function setup(initialMax?: number) {
  const toaster = createToaster<string>();
  currentToaster = toaster;
  max.set(initialMax);
  const view = await render(Host);

  return { toaster, presenter: view.fixture.componentInstance.presenter, view };
}

describe('injectPresenter', () => {
  it('should live with the component: mounted after the first render, unmounted on destroy', async () => {
    const { toaster, presenter, view } = await setup();

    toaster.message('hello');
    expect(presenter.getSnapshot()).toHaveLength(1);

    view.fixture.destroy();
    expect(presenter.getSnapshot()).toHaveLength(0);
  });

  it('should keep options live through a getter', async () => {
    const { toaster, presenter } = await setup(1);

    toaster.message('one');
    toaster.message('two');

    const active = () =>
      presenter.getSnapshot().filter((toast) => toast.phase === 'active');
    expect(active()).toHaveLength(1);

    // The raise lands with change detection and promotes the queued toast.
    max.set(2);
    TestBed.tick();
    expect(active()).toHaveLength(2);
  });
});

describe('injectToasts', () => {
  it('should follow the presenter snapshot into the template', async () => {
    const { toaster, view } = await setup();
    expect(view.container.textContent).toBe('');

    toaster.message('hello');
    TestBed.tick();
    expect(view.container.textContent).toBe('hello');
  });
});
