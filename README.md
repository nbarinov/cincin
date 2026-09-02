<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/hero-dark.png">
  <img src=".github/assets/hero-light.png" alt="cincin 🥂">
</picture>

[cincin](https://cincin.nbarinov.io) is a framework-agnostic toast library:
one tiny core owns the store and the queue, thin adapters bind it to React, Preact,
Vue, and Solid, and a headless layer is there for when the bundled skin stops
fitting.

## Usage

Two steps. Install the adapter for your framework:

```bash
npm install cincin-react   # or cincin-vue, cincin-solid, cincin-preact
```

Then mount `<Toaster />` once, anywhere in the tree. The stylesheet rides
in with the import, so there is nothing else to wire up, and the `toast`
store is ready to call from any client code.

```jsx
import { Toaster, toast } from 'cincin-react';

function App() {
  return (
    <div>
      <Toaster />
      <button onClick={() => toast.success({ title: 'Saved' })}>Save</button>
    </div>
  );
}
```

Toasts are swipeable, the stack collapses to a clean edge and expands on
hover (or on tap), timers pause while it is open and while the tab is
hidden, and reduced motion is respected.

## Learn more

The [demo](https://cincin.nbarinov.io) shows every scenario live, with the
call behind it one click away. Each package README covers its own API:
[`cincin`](./packages/cincin) for the store, the presenter and the DOM
controllers, [`cincin-react`](./packages/cincin-react),
[`cincin-vue`](./packages/cincin-vue),
[`cincin-solid`](./packages/cincin-solid) and
[`cincin-preact`](./packages/cincin-preact) for the bindings, headless
layers included. Runnable apps for every framework, including vanilla DOM
and a [Motion](https://motion.dev)-driven renderer, are in
[`examples/`](./examples).

cincin ships untranspiled modern JS as ESM only; `cincin-react` works with
React 18 and newer.

## Acknowledgements

The stack, the hover expansion and the swipe are inspired by Emil
Kowalski's [sonner](https://sonner.emilkowal.ski).
