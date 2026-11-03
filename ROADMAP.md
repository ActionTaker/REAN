# DEALAN roadmap

Working list for continuous development. Each item ships as its own commit with tests and a browser check.

## Now (owner asked: polish what exists before new features)
- [x] Sample BRRRR and Flip deals so the demo shows every strategy
- [x] Analyzer: fold lookup after apply, compact estimate hints, collapsible long-term assumptions, friendly empty state
- [x] Dashboard/property pages: full-width card names, foldable projection tables, BRRRR return note
- [x] Mobile pass (no horizontal scroll on any page; compact strategy picker; two short fields per row)
- [x] Zero console errors across all pages (fixed settings hydration mismatch)
- [x] BRRRR/Flip money figures in compare and dashboard use real purchase financing
- [ ] Settings: default strategy and BRRRR/Flip defaults (hard money, refinance, selling costs)
- [x] Strategy filter on My Properties (+ADU badge)

## Next
- [ ] Rent roll for 2–4 unit properties (rent per unit)
- [ ] After-tax view: depreciation (27.5 yr) and interest deduction
- [ ] "Analyze as BRRRR / Flip" quick switch from a saved Buy & Hold deal
- [ ] Zillow values entered by hand (Zestimate / Rent Zestimate) with source label

## Later
- [ ] Portfolio tracking for owned properties (actual vs projected)
- [ ] Shareable read-only report links
- [ ] Billing (Stripe) — on hold per owner, don't start until asked

## Done
- Buy & Hold analyzer, dashboard, properties, comparison, reports, settings
- RentCast lookup, address autocomplete, street photos (needs Google key)
- Comps & ARV / Comps & Rent with adjustments, map, condition tags
- Rehab scope estimator; insurance, closing cost and property tax estimates
- Max offer price by goals; stress tests
- BRRRR and Flip strategies
- ADU scenario (Buy & Hold / BRRRR): type presets × state cost index, rent suggestion, cash or loan, value added at cap rate, equity created, break-even $/sq ft
