import type { ToastEntry, Toaster } from 'cincin';
import type { Signal } from '@angular/core';
import { injectSnapshot } from './inject-snapshot';

function injectToastEntries<Content extends {}>(
  toaster: Toaster<Content>
): Signal<ReadonlyArray<ToastEntry<Content>>> {
  return injectSnapshot(toaster);
}

export { injectToastEntries };
