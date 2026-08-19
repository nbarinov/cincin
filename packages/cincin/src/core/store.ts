import { EntityStore } from '../shared/entity-store';
import type { ToastId, Toast, ToastNotifyEvent } from './types';

type ToastStore<Content extends {} = string> = EntityStore<
  ToastId,
  Toast<Content>,
  ToastNotifyEvent<Content>
>;

function createToastStore<Content extends {} = string>(): ToastStore<Content> {
  return new EntityStore({ selectId: (toast) => toast.id });
}

export { createToastStore };
export type { ToastStore };
