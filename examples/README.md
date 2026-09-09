# Examples

Runnable apps, one per binding plus three renderers of their own. They
run on the library sources through the workspace `source` condition, so
a change in `packages/` shows up here without a build; `DIST=1 pnpm dev`
switches them to the built packages, the way consumers get them.

```bash
pnpm install
pnpm dev:radix        # or dev:react, dev:vue, dev:solid, dev:preact,
                      # dev:vanilla, dev:motion, dev:site
```

## In the browser

Every app opens in StackBlitz with no clone: it boots the workspace and
starts that one example. Handy for a bug report — fork the app, break it
there, and send the link back.

| App                                | What it shows                                              |                                                                                           |
| ---------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`react`](./react)                 | The bundled skin, every position and scenario              | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:react)   |
| [`vue`](./vue)                     | The same tour through `cincin-vue`                         | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:vue)     |
| [`solid`](./solid)                 | The same tour through `cincin-solid`                       | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:solid)   |
| [`preact`](./preact)               | The same tour through `cincin-preact`                      | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:preact)  |
| [`vanilla`](./vanilla)             | The DOM controllers with no framework at all               | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:vanilla) |
| [`framer-motion`](./framer-motion) | A renderer over the bare store, exits by `AnimatePresence` | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:motion)  |
| [`radix`](./radix)                 | The store behind Radix Toast primitives, no presenter      | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main?startScript=dev:radix)   |

The link shape is `stackblitz.com/github/<owner>/<repo>/tree/<ref>` plus
`?startScript=<root script>`, so any branch, tag or commit works in place
of `main`. A pull request gets its own set posted as a comment.
