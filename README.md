# QuoteLoop

A narrow, privacy-first quote follow-up board and founder-led setup offer for UK tradespeople.

## Product decision

QuoteLoop is **not** pretending to be a full CRM. The launch wedge is: "a two-minute daily list for the quotes that need a human follow-up". The free board stores quote data in the user's browser; the site stores only pilot applications and aggregate events.

## Run locally

```bash
npm test
PORT=18081 node server.mjs
curl -fsS http://127.0.0.1:18081/health
```

Open `http://127.0.0.1:18081/` and `http://127.0.0.1:18081/app`.

## Safe defaults

- `DRY_RUN=true` by design.
- No automated outreach, message sending, payment processing, or domain purchase.
- `ADMIN_TOKEN` is required for `/admin/leads`; never commit it.
- SQLite database is `data/quoteloop.sqlite` (override with `DB_PATH`).
- To run on a public host, set a strong `ADMIN_TOKEN` in the service environment and keep the app bound to localhost behind the existing reverse proxy.

## Routes

- `/` landing page, calculator, offer and pilot form
- `/app` free local-first quote board
- `/playbook` SEO-friendly free quote follow-up guide
- `/robots.txt` and `/sitemap.xml` acquisition metadata
- `/health` machine health and activation flags
- `/api/metrics` aggregate counts only
- `/admin/leads?token=...` private lead export, disabled until `ADMIN_TOKEN` exists

## What is deliberately not built yet

- No customer login or cloud quote storage
- No SMS/WhatsApp automation
- No payment integration
- No autonomous prospect outreach

Those are validation-dependent follow-ons, not launch prerequisites.
