import { EntityStore } from '../shared/entity-store';
import type { ToastId, ToastEntry, ToastEntryEvent } from './types';

type ToastStore<Content extends {} = string> = EntityStore<
  ToastId,
  ToastEntry<Content>,
  ToastEntryEvent<Content>
>;

function createToastStore<Content extends {} = string>(): ToastStore<Content> {
  return new EntityStore({ selectId: (entry) => entry.id });
}

export { createToastStore };
export type { ToastStore };
