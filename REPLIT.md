# Running EcoPulse on Replit

## Import

1. In Replit: **Create Repl → Import from GitHub → `Itsfixable/EcoPulse`**
2. Replit reads `.replit` and picks Node 22 automatically. No manual setup.
3. Press **Run**. First boot installs dependencies and takes a few minutes —
   Three.js and Next.js are large.

## API key

Do **not** create a `.env.local` on Replit. Use the **Secrets** pane (lock icon):

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | your AI Studio key, starting `AQ.` |

Replit injects Secrets as environment variables, so the provider layer finds it
the same way it does locally. Everything except the assistant works without a key.

## Why you cannot convert the team's existing Repl

An HTML/CSS/JS Repl and a Next.js app are different runtimes, not different
files. Replit picks the language when the Repl is created, so there is no
setting that turns one into the other. Import this repository as a **new Repl**
and keep the old one until the team is happy.

## Why the scripts differ

Replit's router cannot reach a server bound to `localhost`, and it assigns the
port through `$PORT`. So `.replit` runs `dev:replit` / `start:replit`, which bind
`0.0.0.0` and read `$PORT`. The plain `dev` and `start` scripts are left alone so
local development is unaffected.

`next.config.ts` also lists Replit's proxy domains in `allowedDevOrigins`.
Next 16 blocks cross-origin requests to dev-only assets by default, and Replit
serves the workspace from a `*.replit.dev` host rather than localhost, so
without this the preview loads but hot reload and dev endpoints fail.

## Deploying

Use **Autoscale** (already set in `.replit`). It builds with `npm run build` and
serves with `npm run start:replit`. Reserved VM also works and avoids cold starts.

## Known limits on the free tier

- The 3D scene is GPU-light but the **build is memory-hungry**. A free Repl can
  run out of memory during `next build`. If that happens, deploy from Vercel
  instead and keep Replit for development.
- First load after a cold start is slow on Autoscale.

## If the build runs out of memory

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

Set `NODE_OPTIONS` in Secrets to apply it to deployments.
