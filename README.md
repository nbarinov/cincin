<p align="center">
  <a href="https://cincin.nbarinov.io">
    <img src=".github/assets/hero.png" alt="cincin 🥂 — framework-agnostic toasts" width="720" />
  </a>
</p>

<h1 align="center">cincin 🥂</h1>

<p align="center">
  Framework-agnostic toasts: a tiny entry store, a presenter that shows it,
  thin adapters, polished UX.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/cincin"><img src="https://img.shields.io/npm/v/cincin?color=e8b04b&label=cincin" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/cincin"><img src="https://img.shields.io/bundlephobia/minzip/cincin?color=e8b04b" alt="bundle size" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/cincin?color=e8b04b" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="https://cincin.nbarinov.io"><b>Docs & demo</b></a>
  ·
  <a href="./examples">Examples</a>
  ·
  <a href="https://github.com/nbarinov/cincin/issues">Feedback</a>
</p>

---

## Why cincin

- **One core, every framework.** The store and the queue live in
  `cincin`; `cincin-react`, `cincin-vue` and `cincin-solid` are thin
  bindings over the same logic. Vanilla works too.
- **Headless when you need it.** The bundled skin is one opinion built
  from public primitives — when it stops fitting, drop down a level
  instead of fighting it.
- **UX taken seriously.** Swipe to dismiss, the stack collapses to a
  clean edge and expands on hover (or tap), timers pause while it is
  open and while the tab is hidden, reduced motion is respected.
- **Small and honest.** ESM, zero dependencies in the core, tree-shakeable
  entry points, size-limit in CI.

## Quick start

```bash
pnpm add cincin-react   # or cincin-vue, cincin-solid
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
store you can call from anywhere on the client.

```ts
toast.error({
  title: 'Something broke',
  description: 'The request did not survive the round trip.',
  actions: [{ label: 'Retry', onClick: retry }],
});

toast.promise(upload(), {
  loading: { title: 'Uploading…' },
  success: (ms) => ({ title: `Uploaded in ${ms}ms` }),
  error: () => ({ title: 'Upload failed' }),
});
```

The Vue and Solid pairs look the same — see the
[docs](https://cincin.nbarinov.io) or [`examples/`](./examples) for
runnable apps in each framework, including vanilla DOM and a
[Motion](https://motion.dev)-driven renderer.

## Architecture

Two objects with one job each:

- A **toaster** stores toast entries: `create`/`update`/`remove`, type
  and duration rules, `promise` sugar. It knows nothing about showing.
- A **presenter** subscribes to a toaster and shows its entries: a
  `queued | active | leaving` phase per toast, a queue (`max`), an
  expiry clock, pauses, and exits the renderer finishes.

| Package              | What it is                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `cincin`             | The entry store. DOM-free, platform-neutral.                                               |
| `cincin/presenter`   | The showing half: phases, queue, clocks, mount/unmount. Still DOM-free.                    |
| `cincin/dom`         | Framework-free DOM controllers: the swipe gesture, the stack layout, the visibility pause. |
| `cincin-react`       | The ready-to-use `<Toaster />` and the `toast` store singleton.                            |
| `cincin-react/core`  | Headless React bindings: `usePresenter`, `useToasts`, `useStack`, `useSlot`, more.         |
| `cincin-vue`         | The same ready-to-use pair for Vue 3.5.                                                    |
| `cincin-vue/core`    | Headless Vue composables, mirroring the React set.                                         |
| `cincin-solid`       | The same ready-to-use pair for Solid.                                                      |
| `cincin-solid/core`  | Headless Solid primitives, mirroring the React set.                                        |

## Going headless

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
`{ title, description?, actions?, closeButton? }`.
[`examples/vanilla`](./examples/vanilla) is the reference headless
renderer built straight on `cincin/presenter` and `cincin/dom`;
[`examples/framer-motion`](./examples/framer-motion) renders the bare
entry store with Motion, skipping the presenter entirely.

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
