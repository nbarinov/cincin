# cincin-react 🥂

React bindings for the [cincin](https://www.npmjs.com/package/cincin)
toast library: a ready-to-use `<Toaster />` for a quick start, and
headless building blocks under `cincin-react/core`.

> **Alpha.** The API is settling; expect breaking changes between alpha
> releases.

## Install

```bash
pnpm add cincin-react
```

Requires React 19.

## Quick start

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

`<Toaster />` renders a swipeable stack that expands on hover or tap
and pauses its timers while open; the stylesheet comes along with the
import. `toast` is a package-wide instance callable from anywhere on
the client (calls on the server do nothing useful).

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

Several regions or custom wiring: create your own instance with
`createToaster` from `cincin` (add it to your dependencies when you
import it directly) and pass it via `<Toaster toaster={...} />`.

## Headless

```tsx
import { useToastSwipe, useToastExit } from 'cincin-react/core';

function ToastCard({ toast, toaster }) {
  const swipeRef = useToastSwipe(toast.id, toaster);
  const onExitEnd = useToastExit(toast.id, toaster);
  return (
    <li ref={swipeRef} onTransitionEnd={onExitEnd}>
      …
    </li>
  );
}
```

`useToasts(toaster)` subscribes to the snapshot; `createToasterContext<MyContent>()`
returns a `ToasterProvider` with context-aware `useToaster` / `useToasts`
for a typed content payload. The primitives take the instance
explicitly and carry no CSS.

## Documentation and source

[github.com/nbarinov/cincin](https://github.com/nbarinov/cincin)
