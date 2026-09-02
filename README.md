![cincin 🥂](.github/assets/hero.png)

[cincin](https://cincin.nbarinov.io) is a framework-agnostic toast library:
one tiny core owns the store and the queue, thin adapters bind it to React,
Vue and Solid, and a headless layer is there for when the bundled skin stops
fitting.

## Usage

To start using the library, install the adapter for your framework:

```bash
npm install cincin-react   # or cincin-vue, cincin-solid
```

Add `<Toaster />` to your app — it renders a ready-to-use stack and brings
its stylesheet along with the import. After that you can call `toast` from
anywhere on the client.

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

## Documentation

The full API reference, the Vue and Solid pairs, and the headless guide live
in the [documentation](https://cincin.nbarinov.io). Runnable apps for every
framework — including vanilla DOM and a [Motion](https://motion.dev)-driven
renderer — are in [`examples/`](./examples).

cincin ships untranspiled modern JS as ESM only; `cincin-react` works with
React 18 and newer.

## Acknowledgements

The UX — the stack, the hover expansion, the swipe — is inspired by Emil
Kowalski's [sonner](https://sonner.emilkowal.ski).
