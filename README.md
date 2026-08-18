# cincin 🥂

Framework-agnostic toast library: observable core, thin adapters, polished UX.

> **Alpha.** The API is settling; expect breaking changes between alpha
> releases. Feedback is welcome in the issues.

## Quick start (React)

```bash
pnpm add cincin-react
```

```tsx
import { Toaster, toast } from 'cincin-react';

function App() {
  return (
    <>
      <button onClick={() => toast.success({ title: 'Saved' })}>Save</button>
      <Toaster />
    </>
  );
}
```

That is the whole setup: `<Toaster />` renders a ready-to-use stack, its
stylesheet comes along with the import, and `toast` is a package-wide
instance you can call from anywhere on the client. Toasts are swipeable,
the stack expands on hover (or on tap), timers pause while it is open,
and reduced motion is respected.

```ts
toast.error({
  title: 'Something broke',
  description: 'The request did not survive the round trip.',
  action: { label: 'Retry', onClick: retry },
});

toast.promise(upload(), {
  loading: { title: 'Uploading…' },
  success: (ms) => ({ title: `Uploaded in ${ms}ms` }),
  error: () => ({ title: 'Upload failed' }),
});
```

## Packages

| Package             | What it is                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `cincin`            | The core: an observable toast store with timers, queueing and a two-phase dismissal. DOM-free. |
| `cincin/dom`        | Framework-free DOM controllers, starting with the swipe-to-dismiss gesture.                    |
| `cincin-react`      | The ready-to-use `<Toaster />` and the `toast` singleton.                                      |
| `cincin-react/core` | Headless React bindings: `useToasts`, `useToastSwipe`, `useToastExit`, `createToasterContext`. |

## Going headless

The skin is one opinion built from public primitives; when it stops
fitting, drop down a level instead of fighting it.

```ts
import { createToaster } from 'cincin';
import { attachSwipe } from 'cincin/dom';

const toaster = createToaster({ max: 5 });
const unsubscribe = toaster.subscribe(render);

// per toast element:
const detach = attachSwipe(element, {
  onDismiss: () => toaster.dismiss(id),
  onRemove: () => toaster.remove(id),
});
```

```tsx
import {
  createToasterContext,
  useToastSwipe,
  useToastExit,
} from 'cincin-react/core';

const { ToasterProvider, useToaster, useToasts } =
  createToasterContext<MyContent>();
```

The core stores content opaquely, so a headless setup can carry any
payload type; the skin fixes it to `{ title, description?, action? }`.

## Requirements

- ESM only.
- `cincin-react` needs React 19 (ref callback cleanups).
- Modern evergreen browsers; the newest platform APIs in use are
  `AbortSignal.any` and `@starting-style` (2024).

## License

[MIT](./LICENSE)
