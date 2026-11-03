# DEALAN — Rental Property Investment Analysis

A SaaS tool for U.S. residential investors to underwrite **buy & hold** rentals. You enter the purchase, financing, income and expense details and get cash flow, cap rate, cash-on-cash, DSCR, a 30-year projection (the full loan term) and IRR. Every formula is shown in the app.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · PostgreSQL + Prisma 6 · Auth.js v5 · Recharts · Zod + React Hook Form · decimal.js

## Quick start

```bash
npm install
npm run db:local          # terminal 1 — embedded Postgres on :54329 (data in ./.pgdata)
npx prisma migrate deploy # terminal 2
npm run db:seed           # demo account + sample deals
npm run dev
```

Open http://localhost:3000 and click **Explore the demo account** (`demo@dealan.app` / `demo1234`), or register. New accounts start with six labelled sample properties.

Already have Postgres (local, Docker, Neon, Vercel Postgres)? Skip `db:local` and set `DATABASE_URL` in `.env`.

| Script | Purpose |
| --- | --- |
| `npm test` | Financial engine unit tests (node:test) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |

## Address auto-fill (ARV & rent estimates)

The Deal Analyzer can fill a deal in from an address using [RentCast](https://www.rentcast.io/api). The free tier allows 50 calls per month, and each lookup uses 3 calls. It fills in:

- **Property details**: type, units, beds/baths, square feet, year built, latest property tax, HOA
- **As-is value**: the automated valuation and its range, with comparable sales
- **ARV**: the 75th-percentile price per sq ft of comparable sales × the subject's square footage, never below the as-is value (`src/lib/property-data/estimates.ts`)
- **Market rent**: the automated rent estimate with comparable rentals. For 2–4 unit properties it is treated as per unit and multiplied by the unit count.

**Address autocomplete** shows suggestions after 4 characters (`/api/address-suggest`, signed-in users only). It uses Photon (OpenStreetMap: free, no key, but some house numbers are missing) unless `GEOAPIFY_API_KEY` is set. Picking a suggestion fills in the address fields and runs the estimate lookup.

Setup: put `RENTCAST_API_KEY=...` in `.env`. Lookups are cached per address for 30 days in `PropertyDataCache`. When a deal is saved, the server re-reads the lookup from that cache and stores it on the deal (`Property.marketData`), so the detail page and report show where the numbers came from. To try the feature without a key, set `PROPERTY_DATA_PROVIDER=demo`. The numbers are synthetic and clearly labelled as such.

## Strategies: Buy & Hold, BRRRR, Flip

Each deal has a strategy, chosen at the top of the analyzer (`Property.strategy`). BRRRR and Flip inputs and goals are stored in `Property.strategyInputs`.

- **Shared purchase-and-hold phase** (`src/lib/finance/strategies.ts`): cash, hard money (interest-only, % of purchase plus % of rehab funded, points) or a conventional loan; months held; carrying costs (taxes, insurance, HOA, vacant utilities). Interest on hard money is charged on the full loan from day one, which is conservative.
- **BRRRR:** a cash-out refinance at a % of ARV pays off the purchase loan and refinance closing costs. The key results are **cash left in the deal**, % recovered, and cash flow, cash-on-cash (∞ when nothing is left in), DSCR and a 30-year projection, all on the post-refinance rental.
- **Flip:** sale price (defaults to ARV) minus selling costs gives net profit, ROI on cash, annualized ROI, margin and break-even sale price.
- **Max offer price and stress test per strategy** (`strategy-tools.ts`): BRRRR solves for the price at which cash left ≤ target; post-refinance cash flow and DSCR are shown as checks, since price doesn't affect them. Flip solves for profit ≥ $X and ROI ≥ Y%. Both include the 70% rule. The stress tests cover a lower ARV or sale price, rehab overruns, longer holds, a higher refinance rate and lower rent.
- Lists, dashboard, comparison and reports are strategy-aware. Flips are excluded from rental totals and their profit is shown separately.

## Comps & ARV / Comps & Rent

`src/lib/property-data/comps-arv.ts` uses one appraiser-style engine for both sales comps (ARV) and rental comps (market rent per unit).

- Each comp is **adjusted toward the subject** for size (by default at 50% of the median $/sq ft, since location doesn't grow with the house), bedrooms, bathrooms and age. Comps are then weighted by similarity ÷ (1 + miles away).
- **ARV** = the weighted average of comps the user marks *renovated*. With no comps marked, it is the upper quartile of adjusted prices, and never below the as-is value. **Rent** = the weighted average of adjusted rents, with a lower-quartile "conservative" option shown alongside.
- The panel (`comps-arv-sheet.tsx`) is free to use: include or exclude comps, tag condition, edit adjustment percentages, exclude active listings, compare methods, enter a manual value, and see a confidence rating and a distance map. Choices are saved per deal in `Property.arvAnalysis` / `rentAnalysis`.

**Comps map:** Leaflet with OpenStreetMap tiles, so no key is needed. Lookups that lack coordinates (older caches and saved deals) are filled once, for free, by the U.S. Census batch geocoder (`geocode.ts`) and saved back. OpenStreetMap's public tile servers are meant for light use; before launch, point `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` at a tile provider (MapTiler, Stadia, etc.).

**Street photos:** `/api/street-view` proxies Google Street View Static (`GOOGLE_MAPS_API_KEY`, kept on the server). It runs the free metadata check first, so addresses with no imagery don't use image quota. Without a key, the UI says so.

## Cost estimates (rehab, insurance, closing)

`src/lib/estimates/` holds the pure estimators. Each pre-filled value is labelled "Estimate" and stops updating as soon as the user types their own number.

- **Rehab:** pick a scope (Cosmetic / Moderate / Heavy). Line items such as paint and flooring scale with square footage, kitchens and appliances with units, and bathrooms with bath count; a contingency is added on top (10% for cosmetic, 15% for moderate and heavy), and everything is multiplied by a state construction-cost factor. At U.S. average costs this comes to roughly $14, $46 and $96 per sq ft. "Customize line items" lets you edit or add items; the plan is saved with the deal (`Property.rehabPlan`) and shown on the detail page and report.
- **Insurance:** the state's average HO-3 premium (Insurance.com, Sept 2026; quoted for $300k of dwelling coverage), scaled by estimated rebuild cost (sq ft × $175 × the state cost factor), then multiplied by 1.15 because landlord policies cost more.
- **Closing costs:** the state's average buyer closing cost as a % of price (Lodestar 2025 via Bankrate).
- **Property tax:** the state's average effective rate on owner-occupied homes (2023 tax year; Tax Foundation / Lincoln Institute) × purchase price. When an address lookup returns the county's current bill, both numbers are shown with **Use**. The average understates what a new buyer pays where assessments reset at sale (California is flagged), and investors often lose homestead exemptions.

## Max offer price & stress test

Shown under the analyzer and on every property page (`src/lib/finance/solver.ts`, `stress.ts`, `src/lib/offer-goals.ts`).

- **Goals per deal.** Each goal can be switched on or off: break-even cash flow, cash flow per unit, cash-on-cash, cap rate, DSCR, equity created ≥ $X, and the 70% rule. The last two need an ARV. Strategy presets turn on a common set: *Cash flow*, *Equity / value-add*, or *Both*. Targets start from Settings and are saved with the deal (`Property.offerGoals`); on the property page, a "Save goals" button appears once something changes.
- **Max price** for each goal is found by bisection. Rent, expenses, rehab and loan terms stay fixed, closing costs scale with price, and the result is rounded down to $500. The lowest max price among the goals in use is shown as the offer ceiling. A target that isn't a number shows "Enter a number"; it is never reported as "not reachable".
- **Stress test:** shows cash flow and cash-on-cash when rent is 10% lower, the interest rate is 1 pt higher, vacancy is 3 pts higher, taxes and insurance are 20% higher, or repairs and CapEx are 50% higher, and when all of these happen at once. It also gives the highest price that still breaks even in that all-at-once case.
- All of these call `analyzeDeal(..., { yearOneOnly: true })`, which is about 20× faster, so results update while you type.

## Architecture

```
src/lib/finance/        Pure calculation engine — no React, no I/O, no floats
  decimal.ts            decimal.js instance (40-digit precision, half-up)
  mortgage.ts           payment, balance, annual amortization
  analysis.ts           analyzeDeal(inputs) → every metric + projection + sale/IRR
  irr.ts, criteria.ts, portfolio.ts, formulas.ts (UI definitions), format.ts
  finance.test.ts       Reference-value tests
src/lib/validation/     Zod schemas shared by client forms and server actions
src/lib/data/           Server-only data access, always scoped to the signed-in user
src/lib/property-data/  Address lookup: RentCast client, ARV estimator, demo provider, cache
src/app/actions/        Server actions (auth, deals, settings)
src/app/(app)/          Dashboard, Analyzer, Properties, Compare, Reports, Settings
src/components/deal/    Analyzer form + reusable analysis panels
src/components/charts/  Recharts components
```

**Money handling.** Numeric inputs stay strings from the form through to `DECIMAL` columns. All math runs in `decimal.js`, and values are rounded only for display. Charts get `number`s for plotting, but those values never go back into a calculation.

**Calculation conventions** (also shown in the UI):
- Maintenance and CapEx are a % of gross scheduled income. Management is a % of collected income, after vacancy.
- Taxes and insurance are operating expenses, so the mortgage payment is principal and interest only.
- Projection: rent and percent-based costs grow at the rent-growth rate, fixed costs at the expense-growth rate, and value at the appreciation rate, starting from the ARV if one is entered and otherwise from the purchase price. The property is assumed to sell at the end of the holding period.
- Deal ratings compare a deal with the user's own criteria from Settings. They flag deals for review and don't predict results.

## Security

- All reads and writes filter by `userId` from the session. Updates and deletes use `updateMany`/`deleteMany` scoped to the owner.
- Passwords are hashed with bcrypt. Sessions are JWTs (Auth.js Credentials). The Prisma adapter and OAuth tables are already in place for adding Google and similar providers later.
- Set a real `AUTH_SECRET` (`npx auth secret`) before deploying.

## Roadmap

BRRRR (ARV, refinance), ADU analysis, Stripe subscriptions (the plan card is in Settings), property data integrations, portfolio tracking for owned properties, and tax and depreciation modeling.
