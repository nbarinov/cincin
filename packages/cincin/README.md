<img src="https://raw.githubusercontent.com/nbarinov/cincin/main/.github/assets/hero-core.png" alt="cincin 🥂">

The framework-agnostic core of the cincin toast library: an observable
entry store, a presenter that shows it (`cincin/presenter`), and
framework-free DOM controllers (`cincin/dom`).

Looking for the React quick start? See [`cincin-react`](https://www.npmjs.com/package/cincin-react).

## Install

```bash
pnpm add cincin
```

## The store

```ts
import { createToaster } from 'cincin';

const toaster = createToaster({ duration: 4000 });

toaster.success('Saved');
toaster.promise(upload(), {
  loading: 'Uploading…',
  success: (ms) => `Uploaded in ${ms}ms`,
  error: () => 'Upload failed',
});

const unsubscribe = toaster.subscribe((event) => {
  // event.type: 'added' | 'updated' | 'removed'
});
```

The store holds `ToastEntry` records: `create`/`update`/`remove` plus
the type sugar. Content is opaque: `createToaster<MyContent>()` stores
whatever your renderer understands. Duration and dismissibility derive
from the type (`loading` is open-ended and locked) unless set
explicitly, and an update re-derives them only when the type changes:
a content-only update never rewinds the clock, and a morph that must
restart it changes the type. Showing is not the store's business.

## The presenter

```ts
import { createPresenter } from 'cincin/presenter';

const presenter = createPresenter(toaster, { max: 5, exitDuration: 400 });

presenter.subscribe(render);
presenter.mount(); // entries enter, clocks run; unmount() stops it all

// The snapshot holds Toast values: one per showing.
for (const toast of presenter.getSnapshot()) {
  toast.key; // unique per showing (an entry can show more than once)
  toast.entry; // the stored record
  toast.phase; // 'queued' | 'active' | 'leaving'
}

presenter.dismiss(key); // begins the exit; the renderer finishes it
presenter.finish(key); // exit done: the toast goes, and so does the
// entry, once no showing of it remains
presenter.pause(); // hover: freeze the expiry clocks
presenter.setOptions({ max: 3 }); // live options; a raised max promotes
```

A removed entry does not vanish from the screen: its toast becomes a
leaving ghost and plays the exit. A leaving toast nobody finishes is
finished by a safety net, a small grace past the declared
`exitDuration`.

### Swipe to dismiss

```ts
import { attachSwipe } from 'cincin/dom';

const detach = attachSwipe(element, {
  directions: ['right', 'down'],
  onDismiss: () => presenter.dismiss(key),
  onRemove: () => presenter.finish(key),
});
```

The controller writes `translate` and `--cincin-swipe-x/y` on the
element and marks `data-swiping` / `data-swipe-direction`; skins style
off those and declare `user-select: none` on the region. Reduced motion
is respected.

### Stack layout

```ts
import { createStackLayout, createSlotObserver } from 'cincin/dom';

const layout = createStackLayout({ visible: 3, gap: 12 });

// the data spine: mirror the rendered list
layout.setEntries(
  toasts.map((t) => ({ key: t.key, leaving: t.phase === 'leaving' }))
);

// per card: a lens over that card's slot
const slot = createSlotObserver(layout, { key });
const unobserve = slot.observe(element); // the measured node
const unsubscribe = slot.subscribe((s) => {
  // put the slot onto the card in the CSS protocol's vocabulary:
  // --cincin-toast-index, --cincin-toast-offset, z-index, data-hidden,
  // the tri-state data-front, and the measured heights
});
// later: layout.destroy()
```

The layout measures each card's body with a `ResizeObserver`, computes
a `StackSlot` per card (`index`, `offset`, `zIndex`, `hidden`, `front`,
`leaving` and the measured heights) and publishes changes through the
observers; it writes nothing to the DOM itself. The consumer puts the
slots on screen — the CSS protocol for skins, `inert` for semantics —
and turns the numbers into motion with its own transitions; mixed
natural heights collapse into one clean edge. Slot references are
stable between changes, so `subscribe`/`getSnapshot` plug straight
into `useSyncExternalStore`.

### Visibility pause

```ts
import { attachVisibilityPause } from 'cincin/dom';

const detach = attachVisibilityPause(presenter);
```

Pauses every toast while the document is hidden and resumes its own on
return, composing with other pause sources (hover).

## Browser support

The package ships untranspiled modern JS — the newest APIs are
`AbortSignal.any` (the swipe controller) and ES2023's
`Array.prototype.toReversed` (the stack layout), with sizes coming
from `ResizeObserver`: Chrome 116+, Safari 17.4+, Firefox 124+,
Node 20.3+. Skins may raise the bar further with their CSS — the react
skin's stylesheet uses `@starting-style` and `light-dark()`, which
want 2024-class browsers.

## Documentation and source

[github.com/nbarinov/cincin](https://github.com/nbarinov/cincin)
