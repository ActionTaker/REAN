# Deploying DEALAN

DEALAN is a standard Next.js 16 app with Prisma 6 and Postgres. These steps use **Vercel** for the app and **Neon** for the database; any Node host with Postgres works the same way.

## What you need

| Item | Where | Notes |
| --- | --- | --- |
| GitHub repo | already at `ActionTaker/REAN` | Vercel deploys from it |
| Vercel account | vercel.com (Hobby is free) | Import the repo |
| Postgres | Neon (free tier) or Supabase | Copy the connection string with `sslmode=require` |
| Domain | any registrar | Optional for the first deploy; needed before ads |
| RentCast key | rentcast.io | The one in your local `.env` |
| Map tile key | MapTiler / Stadia Maps (free tiers) | OSM's own tile server isn't allowed for production apps |

## Steps

1. **Create the database.** In Neon, create a project in a U.S. region and copy the connection string.
2. **Import the repo in Vercel.** Framework preset: Next.js. Vercel runs `npm run vercel-build`, which applies the Prisma migrations (`prisma migrate deploy`) and then builds. `postinstall` generates the Prisma client.
3. **Set environment variables** in Vercel → Settings → Environment Variables (Production), using `.env.example` as the list:
   - `DATABASE_URL` — the Neon string
   - `AUTH_SECRET` — a new value from `npx auth secret` (don't reuse the local one)
   - `RENTCAST_API_KEY`, `LOOKUP_USER_LIMIT`, `LOOKUP_MONTHLY_LIMIT`
   - `CONTACT_EMAIL` — shown on the Privacy Policy and Terms for privacy and account requests
   - `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`
   - Optional: `GOOGLE_MAPS_API_KEY`, `GEOAPIFY_API_KEY`
   Preview deployments should point at a separate database branch so they never migrate production.
4. **Deploy**, then check on the live URL:
   - The landing page loads; **Try the demo** opens a private demo with sample deals.
   - Register a real account; the analyzer saves a deal.
   - An address lookup works (counts against RentCast; cached addresses don't).
5. **Add the domain** in Vercel → Domains and update DNS at the registrar.

## How the public demo works

- **Try the demo** creates a private guest account with the sample deals. Visitors never see each other's data.
- Guests' address lookups use labelled synthetic data, so the demo never spends the RentCast quota.
- Signing up from inside the demo turns that guest account into the real one and keeps its deals.
- Guest accounts older than 3 days are deleted the next time someone starts a demo.
- The old shared `demo@dealan.app` account (`npm run db:seed`) is only for local development.

## Before running ads

See the media plan in `.claude-ads/runs/` (local only): privacy policy and terms pages, analytics (`sign_up`, `first_deal_saved`), and message-matched landing pages come first.
