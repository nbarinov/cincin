# cincin site

The landing page: the hero, the scenario buttons, and a code panel that
shows the call behind the last button pressed. It renders the real
`<Toaster />` from `cincin-react`, so what a visitor sees is the shipped
skin, not a mock.

Unlike `examples/react`, this workspace does **not** use the `source`
condition: it builds against the packages the way npm ships them, so a
broken exports map or a missing stylesheet fails here first.

```bash
pnpm --filter cincin-site dev      # localhost:5175
pnpm --filter cincin-site build    # → site/dist
```

## Wiring it into the monorepo

`pnpm-workspace.yaml` globs `packages/*` and `examples/*`; add the site:

```yaml
packages:
  - packages/*
  - examples/*
  - site
  - e2e
```

Then `pnpm install` once to link the workspace deps.

## Deploying (Vercel / Netlify)

The build is a plain static Vite output — point the platform at this
directory instead of the repo root:

| Setting          | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| Root directory   | `site`                                                  |
| Install command  | `pnpm install --frozen-lockfile` (run at the repo root) |
| Build command    | `pnpm --filter cincin-site build`                       |
| Output directory | `site/dist`                                             |

Both platforms serve a single-page build with no rewrites needed — the
site is one route.

## Files

- `src/app.tsx` — the page.
- `src/scenarios.ts` — one entry per button: label, the call it makes,
  and the snippet shown for it. The snippet is the call verbatim, so it
  stays copy-pasteable; keep the two in sync when editing.
- `src/theme-toggle.tsx` — the light/dark override, sharing the
  `cincin:theme` storage key with the vanilla example.
- `src/page.css` — the landing's skin. It styles no bare `button`: the
  Toaster renders its own buttons into this document.
