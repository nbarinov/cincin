type ToastId = string | number;
type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading'
  | 'message';

interface ToastEntry<Content extends {} = string> {
  readonly id: ToastId;
  readonly type: ToastType;
  readonly duration: number;
  readonly dismissible: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly content: Content;
}

type ToastCreateOptions = {
  id?: ToastId;
  type?: ToastType;
  duration?: number;
  /** @default true, false for the loading type */
  dismissible?: boolean;
};

type ToastUpdatePatch<Content extends {} = string> = Partial<{
  content: Content;
  type: ToastType;
  duration: number;
  dismissible: boolean;
}>;

interface EntryEvent {
  type: 'added' | 'updated' | 'removed';
}

interface ToastEntryAddedEvent<Content extends {} = string> extends EntryEvent {
  type: 'added';
  entry: ToastEntry<Content>;
}

interface ToastEntryUpdatedEvent<
  Content extends {} = string,
> extends EntryEvent {
  type: 'updated';
  entry: ToastEntry<Content>;
  prev: ToastEntry<Content>;
  /** What the caller asked to change: a presenter restarts its expiry clock
   * on an explicit duration touch even when the value is the same. */
  patch: ToastUpdatePatch<Content>;
  /** Which facade call produced this update: a create over a live id (an
   * upsert, the caller wants the toast shown) or a plain update. A
   * presenter reopens a leaving toast only for 'create'. */
  via: 'create' | 'update';
}

interface ToastEntryRemovedEvent<
  Content extends {} = string,
> extends EntryEvent {
  type: 'removed';
  entry: ToastEntry<Content>;
}

type ToastEntryEvent<Content extends {} = string> =
  | ToastEntryAddedEvent<Content>
  | ToastEntryUpdatedEvent<Content>
  | ToastEntryRemovedEvent<Content>;

interface PromisePhases<T, Content extends {} = string> {
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
type PromiseOptions = Pick<ToastCreateOptions, 'id' | 'dismissible'>;

type ToasterOptions = {
  /** @default 4000 */
  duration?: number;
};

interface Toaster<Content extends {} = string> {
  readonly options: Readonly<Required<ToasterOptions>>;

  success(
    content: Content,
    options?: Omit<ToastCreateOptions, 'type'>
  ): ToastId;
  error(content: Content, options?: Omit<ToastCreateOptions, 'type'>): ToastId;
  warning(
    content: Content,
    options?: Omit<ToastCreateOptions, 'type'>
  ): ToastId;
  info(content: Content, options?: Omit<ToastCreateOptions, 'type'>): ToastId;
  loading(
    content: Content,
    options?: Omit<ToastCreateOptions, 'type'>
  ): ToastId;
  message(
    content: Content,
    options?: Omit<ToastCreateOptions, 'type'>
  ): ToastId;

  create(content: Content, options?: ToastCreateOptions): ToastId;
  update(id: ToastId, patch: ToastUpdatePatch<Content>): void;

  remove(): void;
  remove(id: ToastId): void;
  remove(ids: ToastId[]): void;

  promise<T>(
    promise: Promise<T>,
    phases: PromisePhases<T, Content>,
    options?: PromiseOptions
  ): Promise<T>;

  getSnapshot(): ReadonlyArray<ToastEntry<Content>>;
  subscribe(listener: (event: ToastEntryEvent<Content>) => void): () => void;

  destroy(): void;
}

export type {
  ToastEntry,
  ToastId,
  ToastType,
  ToastCreateOptions,
  ToastUpdatePatch,
  ToastEntryAddedEvent,
  ToastEntryUpdatedEvent,
  ToastEntryRemovedEvent,
  ToastEntryEvent,
  PromisePhases,
  PromiseOptions,
  ToasterOptions,
  Toaster,
};
