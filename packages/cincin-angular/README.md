<img src="https://raw.githubusercontent.com/nbarinov/cincin/v0.2.0/.github/assets/hero-angular.png" alt="cincin-angular 🥂">

Angular bindings for the [cincin](https://www.npmjs.com/package/cincin)
toast library: a ready-to-use `<cincin-toaster />` for a quick start,
and headless building blocks under `cincin-angular/core`.

## Install

```bash
npm install cincin-angular
```

Requires Angular 19 or later, signals and standalone components
included; the package ships as a partial-Ivy library in the Angular
Package Format, so your build links it like any other. With yarn, add
`cincin` next to it: the adapter declares the core as a peer, and yarn
does not install peers on its own.

## Quick start

```ts
import { Component } from '@angular/core';
import { Toaster, toast } from 'cincin-angular';

@Component({
  selector: 'app-root',
  imports: [Toaster],
  template: `
    <button (click)="toast.success({ title: 'Saved' })">Save</button>
    <cincin-toaster />
  `,
})
export class App {
  readonly toast = toast;
}
```

`<cincin-toaster />` renders a swipeable stack that collapses to a
clean edge, expands on hover or tap, and pauses its timers while open
and while the tab is hidden; the stylesheet comes along with the
component, inlined by the Angular compiler, so there is nothing to add
to `angular.json`. `toast` is a package-wide store callable from
anywhere on the client (calls on the server do nothing useful).

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

## Actions

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

## Duration and dismissal

An update inherits the clock and the closability: `duration` and
`dismissible` re-derive from the type's defaults only when the type
changes. Answer a sticky ask in a different type. A confirmation
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

## Keyboard and screen readers

Errors and warnings announce as `alert`, the rest as `status`. Each
card is a tab stop of its own, named by its title and described by its
description, so tabbing into the stack reads the toast before its
controls; the cross and the actions follow in the order they render.
The front toast comes first: Tab enters the newest and walks back
through the older ones. Landing on a card opens the stack the way
hover does, and the collapsed backs stay `inert` until then.

`Alt+T` moves focus onto the front toast from anywhere on the page
(the `hotkey` input changes or drops it), Escape hands it back to where
it came from, and closing a toast from the keyboard passes the focus
on to the next one. The region is a landmark named by `labels.region`.

## Position

```html
<cincin-toaster position="top-center" />
```

Six spots: the four corners and the two edge centers. An explicit
position is physical and final. The default is the bottom inline-end
corner (`bottom-right`, `bottom-left` under RTL) and it is live: the
Toaster watches the root's `dir` and follows a flip without a
re-render. A server-rendered RTL page settles the corner right after
hydration; pass an explicit position to skip that flip. One Toaster
owns one spot: for a second corner, mount a second Toaster over its
own store.

Swiping follows the corner. The default `swipeDirections` set is the
position's outward edges (`['right', 'down']` at `bottom-right`), so
the card leaves toward the nearest viewport edge, and a set spanning
both axes claims `touch-action: none` on the cards, trading scrolling
over them away, deliberately. A center offers only its vertical edge,
and the horizontal axis stays with the browser for scrolling. An
explicit `swipeDirections` overrides the pairing.

## Toaster inputs

| Input             | What it does                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max`             | How many toasts are active at once, the rest queue. Live.                                                                                               |
| `visible`         | How many peek out of the collapsed stack.                                                                                                               |
| `position`        | The region's corner or edge center. Defaults to the bottom inline-end corner, live against the document's `dir`.                                        |
| `swipeDirections` | Which way a card can be flicked. Defaults to the position's outward edges.                                                                              |
| `exitDuration`    | The exit animation's length in ms. One value drives the presenter's exit clock and, published as `--cincin-exit-duration`, the skin's motion durations. |
| `labels`          | The skin's a11y vocabulary, `{ region, close }`. Defaults `'Notifications'` and `'Dismiss'`.                                                            |
| `hotkey`          | The shortcut that moves focus onto the front toast, `'Alt+T'` by default; `false` drops it.                                                             |

The store itself is not an input: it comes through DI (see
[Your own store](#your-own-store)), the package singleton by default.

## Advanced

### Headless

The skin is one opinion built from public primitives. When it stops
fitting, drop down a level instead of fighting it.

```ts
import { Component } from '@angular/core';
import {
  CincinToastSwipe,
  injectPresenter,
  injectToasts,
} from 'cincin-angular/core';
import { toast } from './toast';

@Component({
  selector: 'app-toasts',
  imports: [CincinToastSwipe],
  template: `
    <ol>
      @for (toast of toasts(); track toast.key) {
        <li
          cincinToastSwipe
          [key]="toast.key"
          [presenter]="presenter"
          [enabled]="toast.entry.dismissible"
          [attr.data-phase]="toast.phase"
        >
          {{ toast.entry.content }}
        </li>
      }
    </ol>
  `,
})
export class Toasts {
  // The exit clock finishes leaving toasts on time: declare your exit
  // animation's length, no transitionend listeners needed.
  readonly presenter = injectPresenter(toast, { max: 5, exitDuration: 400 });
  readonly toasts = injectToasts(this.presenter);
}
```

The functions run in an injection context (a field initializer or the
constructor) and return signals; options come as plain values or
getters, so a getter over your inputs keeps an option live. Anything
bound to an element is a directive with inputs, read through a
template reference: `cincinStack` on the list owns a `cincin/dom`
stack layout and mirrors the rendered list into it (`[entries]`,
`[visible]`, `[order]`); `cincinSlot` on a card registers it for
measurement and exposes its live `slot()` (geometry, `front`/`leaving`
for the `inert` rule); `cincinViewport` on the list owns the stack's
attention (open under the pointer or focus, fold a delay after both
leave, hold the clocks while open through `[holder]`) and exposes
`expanded()`; `cincinFocusLoop` on the region runs the keyboard's way
in and out and exposes `jump()`; `cincinToastSwipe` on a card is the
gesture above. The rest of the toolbox: `injectPresenterHolder(presenter)`
is the one holder of the presenter's clocks, `injectVisibilityPause(holder)`
holds them while the document is hidden, `injectHotkey(options)`
binds a document shortcut, `injectToastEntries(toaster)` subscribes to
the store records instead of the showings. The primitives take their
instances explicitly and carry no CSS.

### Your own store

The `toast` singleton is a convenience, not the only way in. Build a
store yourself and provide it where the Toaster can see it:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { createToaster } from 'cincin';
import { provideToaster } from 'cincin-angular';

const toaster = createToaster({ duration: 4000 });

bootstrapApplication(App, { providers: [provideToaster(toaster)] });
```

The instance is read once, when the Toaster is created; a provider on
a component's `providers` scopes it to that subtree. For a typed
content payload, `createToasterContext<MyContent>()` from the core
entry returns its own `provideToaster` with `injectToaster` and
`injectToastEntries` over the same token.

## Browser support

Chrome 116+, Safari 17.4+, Firefox 124+, Node 20.3+ for SSR. The
bundled skin's CSS wants 2024-class browsers. See
[`cincin`](https://www.npmjs.com/package/cincin) for the details.

Source and issues: [github.com/nbarinov/cincin](https://github.com/nbarinov/cincin)
