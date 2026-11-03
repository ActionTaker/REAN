<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Financial math lives only in `src/lib/finance/` and uses `decimal.js` (`D`, `dec`, `pct`). Never do currency math with JS numbers; run `npm test` after touching it.
- `cacheComponents` is intentionally off — all app pages are per-user and request-time.
- Local DB: `npm run db:local` (embedded Postgres, port 54329). Prisma is pinned to v6 (Node 20.16 in this environment; Prisma 7 needs ≥20.19).
