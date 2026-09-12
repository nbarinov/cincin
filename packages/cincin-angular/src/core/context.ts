import type { Toaster, ToastEntry } from 'cincin';
import { InjectionToken, inject } from '@angular/core';
import type { Provider, Signal } from '@angular/core';
import { injectToastEntries as injectToastEntriesOf } from './inject-toast-entries';

function createToasterContext<Content extends {} = string>(
  defaultToaster?: Toaster<Content>
) {
  // A root factory carries the default: an injector without a provider
  // resolves to it, and a `provideToaster` anywhere down the tree wins.
  const TOASTER = new InjectionToken<Toaster<Content> | null>(
    'cincin:toaster',
    { providedIn: 'root', factory: () => defaultToaster ?? null }
  );

  function provideToaster(toaster: Toaster<Content>): Provider {
    return { provide: TOASTER, useValue: toaster };
  }

  function injectToaster(toaster?: Toaster<Content>): Toaster<Content> {
    const resolved = toaster ?? inject(TOASTER) ?? null; // Normalize both nullish values: a JS consumer can provide an undefined toaster.

    if (resolved === null) {
      throw new Error(
        '[cincin] no toaster available. Pass one to createToasterContext, add provideToaster() to an ancestor, or provide an instance explicitly.'
      );
    }

    return resolved;
  }

  function injectToastEntries(
    toaster?: Toaster<Content>
  ): Signal<ReadonlyArray<ToastEntry<Content>>> {
    return injectToastEntriesOf(injectToaster(toaster));
  }

  return { provideToaster, injectToaster, injectToastEntries };
}

export { createToasterContext };
