type ToastId = string | number;
type ToastType =
  'success' | 'error' | 'warning' | 'info' | 'loading' | 'message';

interface Toast<Content extends {} = string> {
  readonly id: ToastId;
  readonly type: ToastType;
  readonly duration: number;
  readonly dismissible: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly content: Content;
}

type CreateOptions = {
  id?: ToastId;
  type?: ToastType;
  duration?: number;
  /** @default true, false for the loading type */
  dismissible?: boolean;
};

type UpdatePatch<Content extends {} = string> = Partial<{
  content: Content;
  type: ToastType;
  duration: number;
  dismissible: boolean;
}>;

interface NotifyEvent {
  type: 'added' | 'updated' | 'removed';
}

interface AddedNotifyEvent<Content extends {} = string> extends NotifyEvent {
  type: 'added';
  toast: Toast<Content>;
}

interface UpdatedNotifyEvent<Content extends {} = string> extends NotifyEvent {
  type: 'updated';
  toast: Toast<Content>;
  previous: Toast<Content>;
  /** What the caller asked to change: a presenter restarts its expiry clock
   * on an explicit duration touch even when the value is the same. */
  patch: UpdatePatch<Content>;
}

interface RemovedNotifyEvent<Content extends {} = string> extends NotifyEvent {
  type: 'removed';
  toast: Toast<Content>;
}

type ToastNotifyEvent<Content extends {} = string> =
  | AddedNotifyEvent<Content>
  | UpdatedNotifyEvent<Content>
  | RemovedNotifyEvent<Content>;

interface PromisePhase<T, Content extends {} = string> {
  loading: Content;
  success?: Content | ((data: T) => Content | Promise<Content>);
  error?: Content | ((error: unknown) => Content | Promise<Content>);
}

/**
 * Toast options a promise can carry. `id` addresses the toast (an
 * existing one gets upserted, exactly like create); `dismissible`
 * overrides the loading lock for the pending phase, the settled phase
 * derives it from its own type again. Durations are not accepted: the
 * loading phase is open-ended by definition and the settled phase takes
 * the type default.
 */
type PromiseOptions = Pick<CreateOptions, 'id' | 'dismissible'>;

interface ToasterConfig {
  /** @default 4000 */
  duration?: number;
}

interface Toaster<Content extends {} = string> {
  readonly config: Readonly<Required<ToasterConfig>>;

  success(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId;
  error(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId;
  warning(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId;
  info(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId;
  loading(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId;
  message(content: Content, options?: Omit<CreateOptions, 'type'>): ToastId;

  create(content: Content, options?: CreateOptions): ToastId;
  update(id: ToastId, patch: UpdatePatch<Content>): void;

  remove(): void;
  remove(id: ToastId): void;
  remove(ids: ToastId[]): void;

  promise<T>(
    promise: Promise<T>,
    phases: PromisePhase<T, Content>,
    options?: PromiseOptions
  ): Promise<T>;

  getSnapshot(): ReadonlyArray<Toast<Content>>;
  subscribe(listener: (event: ToastNotifyEvent<Content>) => void): () => void;

  destroy(): void;
}

export type {
  Toast,
  ToastId,
  ToastType,
  CreateOptions,
  UpdatePatch,
  AddedNotifyEvent,
  UpdatedNotifyEvent,
  RemovedNotifyEvent,
  ToastNotifyEvent,
  PromisePhase,
  PromiseOptions,
  ToasterConfig,
  Toaster,
};
