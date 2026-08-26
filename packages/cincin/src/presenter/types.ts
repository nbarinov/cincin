import type { ToastEntry, ToastUpdatePatch } from '../core/types';

type ToastKey = string;
type ToastPhase = 'queued' | 'active' | 'leaving';

/**
 * A toast as the user sees it: one showing of an entry. It references
 * the entry and outlives it as a ghost (entries are immutable, so a
 * leaving toast keeps the last one it saw).
 */
interface Toast<Content extends {} = string> {
  readonly key: ToastKey;
  readonly entry: ToastEntry<Content>;
  readonly phase: ToastPhase;
  readonly paused: boolean;
}

interface ShowEvent {
  type: 'entered' | 'updated' | 'leaving' | 'left';
}

interface ToastEnteredEvent<Content extends {} = string> extends ShowEvent {
  type: 'entered';
  toast: Toast<Content>;
}

interface ToastUpdatedEvent<Content extends {} = string> extends ShowEvent {
  type: 'updated';
  toast: Toast<Content>;
  prev: Toast<Content>;
  patch?: ToastUpdatePatch<Content>;
}

interface ToastLeavingEvent<Content extends {} = string> extends ShowEvent {
  type: 'leaving';
  toast: Toast<Content>;
}

interface ToastLeftEvent<Content extends {} = string> extends ShowEvent {
  type: 'left';
  toast: Toast<Content>;
}

type ToastEvent<Content extends {} = string> =
  | ToastEnteredEvent<Content>
  | ToastUpdatedEvent<Content>
  | ToastLeavingEvent<Content>
  | ToastLeftEvent<Content>;

type PresenterOptions = {
  /** Active toasts at once; the rest queue. @default Infinity */
  max?: number;
  /** Declared length of the skin's exit animation, ms. A leaving toast
   * nobody finishes is finished for them a small grace past it. The
   * default is a conservative fallback: declare your own. @default 2000 */
  exitDuration?: number;
};

interface Presenter<Content extends {} = string> {
  readonly options: Readonly<Required<PresenterOptions>>;

  setOptions(options: Partial<PresenterOptions>): void;

  dismiss(): void;
  dismiss(key: ToastKey): void;
  dismiss(keys: ToastKey[]): void;

  getRemainingMs(key: ToastKey): number;

  pause(): void;
  pause(key: ToastKey): void;
  pause(keys: ToastKey[]): void;

  resume(): void;
  resume(key: ToastKey): void;
  resume(keys: ToastKey[]): void;

  finish(key: ToastKey): void;

  getSnapshot(): ReadonlyArray<Toast<Content>>;
  subscribe(listener: (event: ToastEvent<Content>) => void): () => void;

  /** Starts showing: the toaster's current entries enter, the clocks run.
   * Mounts are counted; the last unmount stops the clocks, drops every
   * toast at once (no exits: there is no region to animate) and leaves
   * the entry store untouched. */
  mount(): void;
  unmount(): void;
}

export type {
  Toast,
  ToastKey,
  ToastPhase,
  ToastEnteredEvent,
  ToastUpdatedEvent,
  ToastLeavingEvent,
  ToastLeftEvent,
  ToastEvent,
  PresenterOptions,
  Presenter,
};
