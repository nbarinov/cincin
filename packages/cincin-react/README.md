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
import. `toast` is a package-wide store callable from anywhere on the
client (calls on the server do nothing useful).

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

// Closing from app code: the entry goes at once, the exit still plays.
const id = toast.info({ title: 'Connected' });
toast.remove(id);
```

`<Toaster />` props: `toaster` (your own store instead of the
singleton; read once, remount to switch), `max` (active toasts at once,
the rest queue; live), `visible` (how many peek out of the collapsed
stack), `swipeDirection`, `exitDuration` (the exit animation's length,
ms; one value drives the presenter's exit clock and, published as
`--cincin-exit-duration`, the skin's motion durations).

## Headless

```tsx
import { usePresenter, useToasts, useToastSwipe } from 'cincin-react/core';

function Region({ toaster }) {
  // The exit clock (`removeTimeout`) finishes leaving toasts on time:
  // match it to your exit animation, no transitionend listeners needed.
  const presenter = usePresenter(toaster, { max: 5, removeTimeout: 450 });
  const toasts = useToasts(presenter);

  return (
    <ol>
      {toasts.map((toast) => (
        <Card key={toast.key} toast={toast} presenter={presenter} />
      ))}
    </ol>
  );
}

function Card({ toast, presenter }) {
  const swipeRef = useToastSwipe(toast.key, presenter, {
    enabled: toast.entry.dismissible,
  });

  return (
    <li ref={swipeRef} data-phase={toast.phase}>
      {String(toast.entry.content)}
    </li>
  );
}
```

`useToastEntries(toaster)` subscribes to the store records instead of
the showings; `createToasterContext<MyContent>()` returns a
`ToasterProvider` with context-aware `useToaster` / `useToastEntries`
for a typed content payload. The primitives take their instances
explicitly and carry no CSS.

## Browser support

Ships untranspiled ES2023 over `ResizeObserver` (Chrome 110+, Safari
16.4+, Firefox 115+, Node 20+ for SSR), and the bundled skin's CSS
(`@starting-style`, `light-dark()`) wants 2024-class browsers.

## Documentation and source

[github.com/nbarinov/cincin](https://github.com/nbarinov/cincin)
