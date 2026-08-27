# cincin 🥂

Framework-agnostic toast library: an entry store, a presenter that
shows it, thin adapters, polished UX.

> **Beta.** The public names are settled; the path to 0.1.0 is
> additions and fixes. Feedback is welcome in the issues.

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
store you can call from anywhere on the client. Toasts are swipeable,
the stack collapses to a clean edge and expands on hover (or on tap),
timers pause while it is open and while the tab is hidden, and reduced
motion is respected.

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

// Closing from app code: the entry goes at once and the presenter
// plays the exit on screen.
const id = toast.info({ title: 'Connected' });
toast.remove(id);
```

## Architecture

Two objects with one job each:

- A **toaster** stores toast entries: `create`/`update`/`remove`, type
  and duration rules, `promise` sugar. It knows nothing about showing.
- A **presenter** subscribes to a toaster and shows its entries: one
  `Toast` per showing (keyed, with a `queued | active | leaving` phase),
  a queue (`max`), an expiry clock per toast, pauses, and exits the
  renderer finishes. It removes an entry once its last toast is gone.

| Package             | What it is                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `cincin`            | The entry store. DOM-free, platform-neutral.                                               |
| `cincin/presenter`  | The showing half: phases, queue, clocks, mount/unmount. Still DOM-free.                    |
| `cincin/dom`        | Framework-free DOM controllers: the swipe gesture, the stack layout, the visibility pause. |
| `cincin-react`      | The ready-to-use `<Toaster />` and the `toast` store singleton.                            |
| `cincin-react/core` | Headless React bindings: `usePresenter`, `useToasts`, `useStack`, `useSlot`, more.         |

## Going headless

The skin is one opinion built from public primitives; when it stops
fitting, drop down a level instead of fighting it.

```ts
import { createToaster } from 'cincin';
import { createPresenter } from 'cincin/presenter';
import { attachSwipe } from 'cincin/dom';

const toaster = createToaster();
const presenter = createPresenter(toaster, { max: 5 });

presenter.subscribe(render);
presenter.mount();

// per toast element (a presentation, addressed by its key):
const detach = attachSwipe(element, {
  onDismiss: () => presenter.dismiss(key),
  onRemove: () => presenter.finish(key),
});
```

```tsx
import { usePresenter, useToasts } from 'cincin-react/core';

function Region({ toaster }) {
  const presenter = usePresenter(toaster, { max: 5 });
  const toasts = useToasts(presenter);
  // toasts: Toast[] with { key, entry, phase, paused }
}
```

The store keeps content opaque, so a headless setup can carry any
payload type; the skin fixes it to
`{ title, description?, action?, closeButton? }`.
`examples/vanilla` is the reference headless renderer.

## Requirements

- ESM only.
- `cincin-react` needs React 19 (ref callback cleanups).
- Ships untranspiled modern JS (`AbortSignal.any`, ES2023): Chrome
  116+, Safari 17.4+, Firefox 124+. The bundled skin's CSS
  (`@starting-style`, `light-dark()`) wants 2024-class browsers.

## Acknowledgements

The UX — the stack, the hover expansion, the swipe — is inspired by
Emil Kowalski's [sonner](https://sonner.emilkowal.ski).

## License

[MIT](./LICENSE)
