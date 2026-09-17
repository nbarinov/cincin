# cincin site

The landing page and the documentation, at
[cincin.nbarinov.io](https://cincin.nbarinov.io). A TanStack Start app
prerendered to static HTML; it renders the real `<Toaster />` from
`cincin-react` and builds against the packages the way npm ships them,
so a broken exports map fails here first.

```bash
pnpm --filter cincin-site dev         # localhost:5185
pnpm --filter cincin-site... build    # the packages first, then → site/dist/client
```

Vercel serves `site/dist/client` with that build command and `site` as
the root directory.
