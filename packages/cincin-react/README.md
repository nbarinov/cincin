# cincin-react 🥂

React bindings for the [cincin](https://www.npmjs.com/package/cincin)
toast library: a ready-to-use `<Toaster />` for a quick start, and
headless building blocks under `cincin-react/core`.

## Install

```bash
pnpm add cincin-react
```

Requires React 18.

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

`<Toaster />` renders a swipeable stack that collapses to a clean edge,
expands on hover or tap, and pauses its timers while open and while the
tab is hidden; the stylesheet comes along with the import. `toast` is a package-wide store callable from anywhere on the
client (calls on the server do nothing useful).

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

// Closing from app code: the entry goes at once, the exit still plays.
const id = toast.info({ title: 'Connected' });
toast.remove(id);
```

A toast takes one or two actions, and a click on either dismisses it.
The handler receives the click event and can cancel that with
`event.preventDefault()`, say to morph the toast in place by
re-creating its id (the check is synchronous, so prevent before any
`await`):

```ts
const id = toast.message({
  title: 'Message archived',
  actions: [
    {
      label: 'Undo',
      onClick: (event) => {
        event.preventDefault();
        toast.success({ title: 'Archive restored' }, { id });
      },
    },
  ],
});
```

Buttons render in the order you list them, left to right, and that is
also their tab order: the skin never reorders a pair. Which one looks
loud is `variant`, not position, so the two are yours to combine.
`primary` is the outlined default and `secondary` drops the border to
step back.

```ts
toast.message(
  {
    title: 'Invitation',
    description: 'Anna asked to join the workspace.',
    actions: [
      { label: 'Decline', variant: 'secondary', onClick: decline },
      { label: 'Accept', onClick: accept },
    ],
  },
  { duration: Infinity, dismissible: false }
);
```

There is no `disabled` on an action, on purpose. A pending Accept is
better said out loud: prevent the dismiss and re-create the same id as
`toast.loading({ title: 'Accepting…' })`, and the buttons stop existing
instead of greying out.

An update inherits the clock and the closability: `duration` and
`dismissible` re-derive from the type's defaults only when the type
changes. Answer a sticky ask in a different type — a confirmation
morphed in the asking type inherits the open-ended clock and strands
on screen with no cross, no swipe, and no expiry.

The cross is chrome, not permission. `closeButton: false` hides it and
leaves the toast swipeable, which is what an undo toast wants: the
button reads as the way out, and the gesture is still there for anyone
who would rather flick it away. `dismissible: false` is the other
thing entirely, it takes the right to close away (no cross, no swipe),
and no `closeButton` brings the cross back.

```ts
toast.message({
  title: 'Message archived',
  closeButton: false,
  actions: [{ label: 'Undo', onClick: undoArchive }],
});
```

`<Toaster />` props: `toaster` (your own store instead of the
singleton; read once, remount to switch), `max` (active toasts at once,
the rest queue; live), `visible` (how many peek out of the collapsed
stack), `position` (the region's corner or edge center; the default
is the bottom inline-end corner, live against the document's `dir`),
`swipeDirections` (defaults to the position's outward edges),
`exitDuration` (the exit animation's length,
ms; one value drives the presenter's exit clock and, published as
`--cincin-exit-duration`, the skin's motion durations), `labels` (the
skin's a11y vocabulary: `{ region, close }`, defaults `'Notifications'`
and `'Dismiss'`).

## Position

```tsx
<Toaster position="top-center" />
```

Six spots: the four corners and the two edge centers. An explicit
position is physical and final. The default is the bottom inline-end
corner — `bottom-right`, `bottom-left` under RTL — and it is live: the
Toaster watches the root's `dir` and follows a flip without a
re-render. A server-rendered RTL page settles the corner right after
hydration; pass an explicit position to skip that flip. One Toaster
owns one spot: for a second corner, mount a second Toaster over its
own store.

Swiping follows the corner. The default `swipeDirections` set is the
position's outward edges (`['right', 'down']` at `bottom-right`), so
the card leaves toward the nearest viewport edge — and a set spanning
both axes claims `touch-action: none` on the cards, trading scrolling
over them away, deliberately. A center offers only its vertical edge,
and the horizontal axis stays with the browser for scrolling. An
explicit `swipeDirections` overrides the pairing.

## Headless

```tsx
import { usePresenter, useToasts, useToastSwipe } from 'cincin-react/core';

function Region({ toaster }) {
  // The exit clock finishes leaving toasts on time: declare your exit
  // animation's length, no transitionend listeners needed.
  const presenter = usePresenter(toaster, { max: 5, exitDuration: 400 });
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
  const swipe = useToastSwipe({
    key: toast.key,
    presenter,
    enabled: toast.entry.dismissible,
  });

  return (
    <li data-phase={toast.phase} style={swipe.style} {...swipe.handlers}>
      {String(toast.entry.content)}
    </li>
  );
}
```

The rest of the toolbox: `useStack(toasts, { visible, gap })` owns a
`cincin/dom` stack layout and mirrors the rendered list into it;
`useSlot({ layout, key })` reads one card's live slot (geometry,
`front`/`leaving` for the `inert` rule) and returns the ref that
registers the card for measurement; `useVisibilityPause(presenter)`
pauses the toasts while the document is hidden; `useToastEntries(toaster)`
subscribes to the store records instead of the showings;
`createToasterContext<MyContent>()` returns a `ToasterProvider` with
context-aware `useToaster` / `useToastEntries` for a typed content
payload. The primitives take their instances explicitly and carry no
CSS.

## Browser support

Ships untranspiled modern JS (`AbortSignal.any`, ES2023 array methods)
over `ResizeObserver`: Chrome 116+, Safari 17.4+, Firefox 124+,
Node 20.3+ for SSR. The bundled skin's CSS (`@starting-style`,
`light-dark()`) wants 2024-class browsers.

## Documentation and source

[github.com/nbarinov/cincin](https://github.com/nbarinov/cincin)
