import type { Toast } from '../core/types';

type PresentationKey = string;
type Phase = 'queued' | 'active' | 'leaving';

interface Presentation<ToastContent extends {} = string> {
  readonly key: PresentationKey;
  readonly toast: Toast<ToastContent>;
  readonly phase: Phase;
  readonly paused: boolean;
}

interface NotifyEvent {
  type: 'entered' | 'updated' | 'leaving' | 'left';
}

interface EnteredEvent<ToastContent extends {} = string> extends NotifyEvent {
  type: 'entered';
  presentation: Presentation<ToastContent>;
}

interface UpdatedEvent<ToastContent extends {} = string> extends NotifyEvent {
  type: 'updated';
  presentation: Presentation<ToastContent>;
  previous: Presentation<ToastContent>;
}

interface LeavingEvent<ToastContent extends {} = string> extends NotifyEvent {
  type: 'leaving';
  presentation: Presentation<ToastContent>;
}

interface LeftEvent<ToastContent extends {} = string> extends NotifyEvent {
  type: 'left';
  presentation: Presentation<ToastContent>;
}

type PresenterEvent<ToastContent extends {} = string> =
  | EnteredEvent<ToastContent>
  | UpdatedEvent<ToastContent>
  | LeavingEvent<ToastContent>
  | LeftEvent<ToastContent>;

interface PresenterConfig {
  /** Visible (active) presentations at once; the rest queue. @default Infinity */
  max?: number;
  /** Ceiling for a leaving presentation nobody finishes, ms. @default 2000 */
  removeTimeout?: number;
}

interface Presenter<ToastContent extends {} = string> {
  readonly config: Readonly<Required<PresenterConfig>>;

  dismiss(): void;
  dismiss(key: PresentationKey): void;
  dismiss(keys: PresentationKey[]): void;

  getRemainingMs(key: PresentationKey): number;

  pause(): void;
  pause(key: PresentationKey): void;
  pause(keys: PresentationKey[]): void;

  resume(): void;
  resume(key: PresentationKey): void;
  resume(keys: PresentationKey[]): void;

  finish(key: PresentationKey): void;

  getSnapshot(): ReadonlyArray<Presentation<ToastContent>>;
  subscribe(
    listener: (event: PresenterEvent<ToastContent>) => void
  ): () => void;

  /** Starts showing: the toaster's current records enter, the clocks run.
   * Mounts are counted; the last unmount stops the clocks, drops every
   * presentation at once (no exits: there is no region to animate) and
   * leaves the record store untouched. */
  mount(): void;
  unmount(): void;
}

export type {
  Presentation,
  PresentationKey,
  Phase,
  EnteredEvent,
  UpdatedEvent,
  LeavingEvent,
  LeftEvent,
  PresenterEvent,
  PresenterConfig,
  Presenter,
};
