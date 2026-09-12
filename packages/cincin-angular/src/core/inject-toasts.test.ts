import { TestBed } from '@angular/core/testing';
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { injectToasts } from './inject-toasts';

describe('injectToasts', () => {
  it('should seed from the snapshot and follow commits', () => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();
    toaster.message('one');

    const toasts = TestBed.runInInjectionContext(() => injectToasts(presenter));
    expect(toasts().map((toast) => toast.entry.content)).toEqual(['one']);

    toaster.message('two');
    expect(toasts().map((toast) => toast.entry.content)).toEqual([
      'one',
      'two',
    ]);
  });

  it('should unsubscribe with the injector', () => {
    const toaster = createToaster();
    const presenter = createPresenter(toaster);
    presenter.mount();

    const toasts = TestBed.runInInjectionContext(() => injectToasts(presenter));
    TestBed.resetTestingModule();

    toaster.message('late');
    expect(toasts()).toEqual([]);
  });
});
