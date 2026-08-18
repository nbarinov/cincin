# cincin 🥂

The framework-agnostic core of the cincin toast library: an observable
toast store with timers, queueing and a two-phase dismissal, plus
framework-free DOM controllers under `cincin/dom`.

> **Alpha.** The API is settling; expect breaking changes between alpha
> releases.

Looking for the React quick start? See [`cincin-react`](https://www.npmjs.com/package/cincin-react).

## Install

```bash
pnpm add cincin
```

## Usage

```ts
import { createToaster } from 'cincin';

const toaster = createToaster({ max: 5, duration: 4000 });

toaster.success('Saved');
toaster.promise(
  upload(),
  {
    loading: 'Uploading…',
    success: (ms) => `Uploaded in ${ms}ms`,
    error: () => 'Upload failed',
  },
  { id: 'upload' } // optional: address the toast, override dismissible
);

const unsubscribe = toaster.subscribe((event) => {
  // event.type: 'added' | 'updated' | 'dismissed' | 'removed'
  render(toaster.getSnapshot());
});
```

Content is opaque to the core: `createToaster<MyContent>()` stores
whatever your renderer understands. Dismissal is two-phase: `dismiss`
marks a toast `dismissing` (it stays in the snapshot so an exit
animation can play), `remove` deletes it; a safety net removes stuck
toasts on its own.

### Swipe to dismiss

```ts
import { attachSwipe } from 'cincin/dom';

const detach = attachSwipe(element, {
  direction: 'right',
  onDismiss: () => toaster.dismiss(id),
  onRemove: () => toaster.remove(id),
});
```

The controller writes `translate` and `--cincin-swipe-x/y` on the
element and marks `data-swiping` / `data-swipe-direction`; skins style
off those. Reduced motion is respected.

## Documentation and source

[github.com/nbarinov/cincin](https://github.com/nbarinov/cincin)
