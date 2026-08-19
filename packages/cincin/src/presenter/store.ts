import { EntityStore } from '../shared/entity-store';
import type { Presentation, PresentationKey, PresenterEvent } from './types';

type PresentationStore<ToastContent extends {} = string> = EntityStore<
  PresentationKey,
  Presentation<ToastContent>,
  PresenterEvent<ToastContent>
>;

function createPresentationStore<
  ToastContent extends {} = string,
>(): PresentationStore<ToastContent> {
  return new EntityStore({ selectId: (p) => p.key });
}

export { createPresentationStore };
export type { PresentationStore };
