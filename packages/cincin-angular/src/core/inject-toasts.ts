import type { Presenter, Toast } from 'cincin/presenter';
import type { Signal } from '@angular/core';
import { injectSnapshot } from './inject-snapshot';

function injectToasts<Content extends {}>(
  presenter: Presenter<Content>
): Signal<ReadonlyArray<Toast<Content>>> {
  return injectSnapshot(presenter);
}

export { injectToasts };
