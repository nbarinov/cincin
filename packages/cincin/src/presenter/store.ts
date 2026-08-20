import { EntityStore } from '../shared/entity-store';
import type { Toast, ToastKey, ToastEvent } from './types';

type PresenterStore<Content extends {} = string> = EntityStore<
  ToastKey,
  Toast<Content>,
  ToastEvent<Content>
>;

function createPresenterStore<
  Content extends {} = string,
>(): PresenterStore<Content> {
  return new EntityStore({ selectId: (p) => p.key });
}

export { createPresenterStore };
export type { PresenterStore };
