# Examples

Runnable apps, one per binding plus three renderers of their own.

Each one is a standalone project: it names the cincin packages by their
published versions, so the folder runs anywhere you drop it. Inside this
workspace pnpm links the local copies over those ranges instead
(`linkWorkspacePackages`), and the vite config notices the sources next
to them and switches on the `source` condition — so a change in
`packages/` still shows up here with no build. `DIST=1 pnpm dev:<app>`
opts out of that and runs the built packages.

```bash
pnpm install
pnpm dev:radix        # or dev:react, dev:vue, dev:solid, dev:preact,
                      # dev:vanilla, dev:motion, dev:site
```

## In the browser

Every app opens in StackBlitz on its own — one folder, npm install, no
monorepo to boot. These run the published cincin, which is what you want
for a look around or for a bug report you can hand back as a link.

| App                                | What it shows                                              |                                                                                          |
| ---------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`react`](./react)                 | The bundled skin, every position and scenario              | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/react)         |
| [`vue`](./vue)                     | The same tour through `cincin-vue`                         | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/vue)           |
| [`solid`](./solid)                 | The same tour through `cincin-solid`                       | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/solid)         |
| [`preact`](./preact)               | The same tour through `cincin-preact`                      | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/preact)        |
| [`vanilla`](./vanilla)             | The DOM controllers with no framework at all               | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/vanilla)       |
| [`framer-motion`](./framer-motion) | A renderer over the bare store, exits by `AnimatePresence` | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/framer-motion) |
| [`radix`](./radix)                 | The store behind Radix Toast primitives, no presenter      | [Open ↗](https://stackblitz.com/github/nbarinov/cincin/tree/main/examples/radix)         |

To try a change instead of the release, open a pull request: CI publishes
a preview build of every package through
[pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new) and comments
with install urls plus one StackBlitz instance per example, each running
against that build.
