# Contributing

Hi! cincin is a one-person project, so a bug report with a reproduction
or a small fix already makes my week. If you are not sure where to
start, look for `good first issue`.

## Before you write code

Fixes and docs: just open a pull request. Anything that changes how the
library behaves, a new adapter included: open an issue first and let us
talk it through. Design decisions here happen in conversation, and an
issue costs minutes where a rewritten pull request costs an evening.

For a bug, tell me the adapter and version, the browser, and how to
reproduce it. A fork of one of the apps in [`examples/`](./examples) is
the quickest way to show it: the index there opens each one in
StackBlitz, so a reproduction is a link, not a repository.

An example names the published cincin versions rather than
`workspace:*`, which is what lets that link work on a bare folder; the
workspace links the local packages over them, so the source loop is
unchanged. `pnpm check` fails if a release leaves the two out of step.

## Working in the repo

`pnpm install`, then hack on the sources: the apps in `examples/` run
against them directly, no build needed. Before you push, run
`pnpm check`; it is what CI runs. If you touched the swipe, the stack
or a skin, run the browser tests too, `pnpm test:e2e`.

One rule worth knowing: the core never touches the DOM. That is what
lets a single store drive every adapter, so keep `document` and
`window` out of `packages/cincin` unless you are in `dom/`.

Keep a pull request to one thing, and write what changed and why in
your own words; AI in the loop is fine, as long as you understand and
tested the result. Pull requests are squash merged, so the title is
what lands in history: `fix(cincin-vue): ...`, `feat(cincin): ...`.
Leave the versions alone, releases are on me.
